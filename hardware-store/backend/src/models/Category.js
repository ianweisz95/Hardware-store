import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: String,
    image: String,
    icon: String, // lucide icon name
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    level: { type: Number, default: 0 }, // 0=root, 1=sub, 2=sub-sub
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  next();
});

categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
