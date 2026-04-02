import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "customer"],
      default: "customer",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    avatar: String,
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: Date,
    refreshToken: { type: String, select: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Customer-specific fields
    loyaltyPoints: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    creditBalance: { type: Number, default: 0 },
    // Staff-specific
    employeeId: String,
    department: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check permissions
userSchema.methods.hasPermission = function (permission) {
  const permissions = {
    admin: ["*"],
    manager: [
      "read:products", "write:products", "delete:products",
      "read:inventory", "write:inventory",
      "read:orders", "write:orders", "delete:orders",
      "read:customers", "write:customers",
      "read:reports", "read:employees",
      "write:pos", "read:pos",
    ],
    cashier: [
      "read:products", "read:inventory",
      "read:orders", "write:orders",
      "write:pos", "read:pos",
      "read:customers", "write:customers",
    ],
    customer: [
      "read:products",
      "read:orders",
      "write:cart",
    ],
  };

  const rolePerms = permissions[this.role] || [];
  return rolePerms.includes("*") || rolePerms.includes(permission);
};

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ branch: 1 });

const User = mongoose.model("User", userSchema);
export default User;
