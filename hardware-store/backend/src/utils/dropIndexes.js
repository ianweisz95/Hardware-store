import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

try { await db.collection('products').dropIndex('slug_1'); console.log('Dropped slug_1'); } catch(e) { console.log('slug_1:', e.message); }
try { await db.collection('products').dropIndex('variants.sku_1'); console.log('Dropped variants.sku_1'); } catch(e) { console.log('variants.sku_1:', e.message); }

await mongoose.disconnect();
console.log('All done — now run: npm run seed');
