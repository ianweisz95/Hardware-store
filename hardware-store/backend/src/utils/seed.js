import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import { Branch, Supplier } from "../models/Branch.js";

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Branch.deleteMany({}),
    Supplier.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  // Create branch
  const mainBranch = await Branch.create({
    name: "Main Branch - Nairobi CBD",
    code: "NBO-MAIN",
    address: { street: "Tom Mboya Street", city: "Nairobi", county: "Nairobi" },
    phone: "+254700000001",
    email: "main@hardwarestore.co.ke",
    isMainBranch: true,
    isActive: true,
  });

  const westlandsBranch = await Branch.create({
    name: "Westlands Branch",
    code: "NBO-WEST",
    address: { street: "Westlands Road", city: "Nairobi", county: "Nairobi" },
    phone: "+254700000002",
    email: "westlands@hardwarestore.co.ke",
    isActive: true,
  });

  console.log("Branches created");

  // Create users
  const admin = await User.create({
    name: "Admin User",
    email: "admin@hardwarestore.co.ke",
    phone: "0700000000",
    password: "Admin@1234",
    role: "admin",
    isActive: true,
    isEmailVerified: true,
  });

  const manager = await User.create({
    name: "John Kamau",
    email: "manager@hardwarestore.co.ke",
    phone: "0711000001",
    password: "Manager@1234",
    role: "manager",
    branch: mainBranch._id,
    isActive: true,
  });

  const cashier = await User.create({
    name: "Mary Wanjiku",
    email: "cashier@hardwarestore.co.ke",
    phone: "0722000002",
    password: "Cashier@1234",
    role: "cashier",
    branch: mainBranch._id,
    isActive: true,
    employeeId: "EMP-001",
  });

  await User.create({
    name: "Peter Ochieng",
    email: "customer@example.com",
    phone: "0733000003",
    password: "Customer@1234",
    role: "customer",
    loyaltyPoints: 250,
  });

  console.log("Users created");

  // Update branch manager
  await Branch.findByIdAndUpdate(mainBranch._id, { manager: manager._id });

  // Create categories
  const cementCat = await Category.create({ name: "Cement & Concrete", icon: "building", sortOrder: 1 });
  const toolsCat = await Category.create({ name: "Tools & Equipment", icon: "wrench", sortOrder: 2 });
  const electricalCat = await Category.create({ name: "Electrical", icon: "zap", sortOrder: 3 });
  const plumbingCat = await Category.create({ name: "Plumbing", icon: "droplets", sortOrder: 4 });
  const paintCat = await Category.create({ name: "Paint & Finishes", icon: "paintbrush", sortOrder: 5 });
  const roofingCat = await Category.create({ name: "Roofing", icon: "home", sortOrder: 6 });

  // Sub-categories
  await Category.create({ name: "Hand Tools", parent: toolsCat._id, level: 1 });
  await Category.create({ name: "Power Tools", parent: toolsCat._id, level: 1 });
  await Category.create({ name: "Wiring & Cables", parent: electricalCat._id, level: 1 });
  await Category.create({ name: "Switches & Sockets", parent: electricalCat._id, level: 1 });

  console.log("Categories created");

  // Create supplier
  const supplier = await Supplier.create({
    name: "Bamburi Cement Ltd",
    contactPerson: "James Mwangi",
    email: "supply@bamburicement.co.ke",
    phone: "+254200400000",
    address: { city: "Mombasa", county: "Mombasa" },
    kraPin: "P000000000A",
    paymentTerms: 30,
    isActive: true,
  });

  // Create products
  const products = [
    {
      name: "Bamburi Cement 50kg",
      description: "High-quality Portland cement for construction",
      category: cementCat._id,
      brand: "Bamburi",
      sku: "CEM-BAM-50",
      barcode: "5901234123457",
      price: 750,
      costPrice: 620,
      unit: "bag",
      taxRate: 16,
      supplier: supplier._id,
      lowStockThreshold: 50,
      tags: ["cement", "construction", "bamburi"],
    },
    {
      name: "Simba Cement 50kg",
      description: "Premium quality cement",
      category: cementCat._id,
      brand: "Simba",
      sku: "CEM-SIM-50",
      barcode: "5901234123458",
      price: 720,
      costPrice: 600,
      unit: "bag",
      taxRate: 16,
      lowStockThreshold: 50,
    },
    {
      name: "Hacksaw Frame with Blade",
      description: "Heavy-duty adjustable hacksaw frame",
      category: toolsCat._id,
      brand: "Stanley",
      sku: "TOOL-HSW-001",
      barcode: "5901234123459",
      price: 450,
      costPrice: 280,
      unit: "piece",
      lowStockThreshold: 10,
      tags: ["hacksaw", "tool", "cutting"],
    },
    {
      name: "Claw Hammer 500g",
      description: "Professional claw hammer",
      category: toolsCat._id,
      brand: "Stanley",
      sku: "TOOL-HAM-500",
      barcode: "5901234123460",
      price: 650,
      costPrice: 400,
      unit: "piece",
      lowStockThreshold: 10,
    },
    {
      name: "2.5mm² Electrical Cable (per meter)",
      description: "Single core PVC insulated cable",
      category: electricalCat._id,
      brand: "Kenwest",
      sku: "ELEC-CAB-25",
      barcode: "5901234123461",
      price: 45,
      costPrice: 30,
      unit: "meter",
      lowStockThreshold: 100,
    },
    {
      name: "MCB 20A Single Pole",
      description: "Miniature circuit breaker",
      category: electricalCat._id,
      brand: "Clipsal",
      sku: "ELEC-MCB-20",
      barcode: "5901234123462",
      price: 380,
      costPrice: 240,
      unit: "piece",
      lowStockThreshold: 15,
    },
    {
      name: "PPR Pipe 20mm (per meter)",
      description: "Polypropylene random copolymer pipe",
      category: plumbingCat._id,
      brand: "Aquatech",
      sku: "PLMB-PPR-20",
      barcode: "5901234123463",
      price: 120,
      costPrice: 80,
      unit: "meter",
      lowStockThreshold: 50,
    },
    {
      name: "Crown Paint Interior Matt 4L",
      description: "Premium interior emulsion paint",
      category: paintCat._id,
      brand: "Crown Paints",
      sku: "PAINT-CROWN-4L",
      barcode: "5901234123464",
      price: 1250,
      costPrice: 900,
      unit: "litre",
      lowStockThreshold: 20,
    },
    {
      name: "Mabati Iron Sheet 3m (32 gauge)",
      description: "Corrugated iron roofing sheet",
      category: roofingCat._id,
      brand: "Mabati Rolling Mills",
      sku: "ROOF-MABATI-3M",
      barcode: "5901234123465",
      price: 850,
      costPrice: 680,
      unit: "piece",
      lowStockThreshold: 30,
    },
    {
      name: "Power Drill 750W",
      description: "Variable speed electric drill with hammer function",
      category: toolsCat._id,
      brand: "Bosch",
      sku: "TOOL-DRILL-750",
      barcode: "5901234123466",
      price: 8500,
      costPrice: 6200,
      unit: "piece",
      lowStockThreshold: 5,
      isFeatured: true,
    },
  ];

  const createdProducts = await Product.insertMany(products);
  console.log(`${createdProducts.length} products created`);

  // Create inventory for each product and branch
  const inventoryRecords = [];
  const quantities = [200, 150, 30, 25, 500, 40, 200, 60, 80, 12];

  for (let i = 0; i < createdProducts.length; i++) {
    inventoryRecords.push({
      product: createdProducts[i]._id,
      branch: mainBranch._id,
      quantity: quantities[i],
      lowStockThreshold: createdProducts[i].lowStockThreshold,
      reorderPoint: Math.floor(createdProducts[i].lowStockThreshold * 0.5),
    });
    inventoryRecords.push({
      product: createdProducts[i]._id,
      branch: westlandsBranch._id,
      quantity: Math.floor(quantities[i] * 0.4),
      lowStockThreshold: createdProducts[i].lowStockThreshold,
    });
  }

  await Inventory.insertMany(inventoryRecords);
  console.log("Inventory created");

  console.log("\n✅ SEED COMPLETE\n");
  console.log("Login credentials:");
  console.log("  Admin:    admin@hardwarestore.co.ke / Admin@1234");
  console.log("  Manager:  manager@hardwarestore.co.ke / Manager@1234");
  console.log("  Cashier:  cashier@hardwarestore.co.ke / Cashier@1234");
  console.log("  Customer: customer@example.com / Customer@1234");

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
