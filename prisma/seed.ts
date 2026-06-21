import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const BCRYPT_ROUNDS = 12;

// --- Taxonomy definitions ----------------------------------------------------

// 20+ top-level categories.
const CATEGORIES: { name: string; slug: string }[] = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors' },
  { name: 'Toys & Games', slug: 'toys-games' },
  { name: 'Books & Stationery', slug: 'books-stationery' },
  { name: 'Groceries', slug: 'groceries' },
  { name: 'Health & Wellness', slug: 'health-wellness' },
  { name: 'Automotive', slug: 'automotive' },
  { name: 'Pet Supplies', slug: 'pet-supplies' },
  { name: 'Baby & Kids', slug: 'baby-kids' },
  { name: 'Garden & Outdoor', slug: 'garden-outdoor' },
  { name: 'Office Supplies', slug: 'office-supplies' },
  { name: 'Jewelry & Watches', slug: 'jewelry-watches' },
  { name: 'Furniture', slug: 'furniture' },
  { name: 'Musical Instruments', slug: 'musical-instruments' },
  { name: 'Arts & Crafts', slug: 'arts-crafts' },
  { name: 'Tools & Home Improvement', slug: 'tools-home-improvement' },
  { name: 'Food & Beverages', slug: 'food-beverages' },
  { name: 'Travel & Luggage', slug: 'travel-luggage' },
  { name: 'Gaming', slug: 'gaming' },
];

// 20 subcategories for the Electronics category.
const ELECTRONICS_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: 'Smartphones', slug: 'smartphones' },
  { name: 'Laptops', slug: 'laptops' },
  { name: 'Tablets', slug: 'tablets' },
  { name: 'Desktop Computers', slug: 'desktop-computers' },
  { name: 'Monitors', slug: 'monitors' },
  { name: 'Keyboards', slug: 'keyboards' },
  { name: 'Mice', slug: 'mice' },
  { name: 'Headphones', slug: 'headphones' },
  { name: 'Speakers', slug: 'speakers' },
  { name: 'Cameras', slug: 'cameras' },
  { name: 'Smartwatches', slug: 'smartwatches' },
  { name: 'Televisions', slug: 'televisions' },
  { name: 'Printers', slug: 'printers' },
  { name: 'Routers & Networking', slug: 'routers-networking' },
  { name: 'External Storage', slug: 'external-storage' },
  { name: 'Power Banks', slug: 'power-banks' },
  { name: 'Chargers & Cables', slug: 'chargers-cables' },
  { name: 'Drones', slug: 'drones' },
  { name: 'Projectors', slug: 'projectors' },
  { name: 'Gaming Consoles', slug: 'gaming-consoles' },
];

// A few subcategories for other categories so the taxonomy is well-rounded.
const OTHER_SUBCATEGORIES: Record<string, { name: string; slug: string }[]> = {
  fashion: [
    { name: 'Sneakers', slug: 'sneakers' },
    { name: 'T-Shirts', slug: 't-shirts' },
    { name: 'Jeans', slug: 'jeans' },
    { name: 'Jackets', slug: 'jackets' },
    { name: 'Dresses', slug: 'dresses' },
  ],
  'home-kitchen': [
    { name: 'Cookware', slug: 'cookware' },
    { name: 'Small Appliances', slug: 'small-appliances' },
    { name: 'Dinnerware', slug: 'dinnerware' },
    { name: 'Bedding', slug: 'bedding' },
  ],
  'beauty-personal-care': [
    { name: 'Skincare', slug: 'skincare' },
    { name: 'Makeup', slug: 'makeup' },
    { name: 'Hair Care', slug: 'hair-care' },
    { name: 'Fragrances', slug: 'fragrances' },
  ],
  'sports-outdoors': [
    { name: 'Fitness Equipment', slug: 'fitness-equipment' },
    { name: 'Camping Gear', slug: 'camping-gear' },
    { name: 'Cycling', slug: 'cycling' },
  ],
  gaming: [
    { name: 'PC Games', slug: 'pc-games' },
    { name: 'Console Games', slug: 'console-games' },
    { name: 'Accessories', slug: 'gaming-accessories' },
  ],
};

// --- Shops --------------------------------------------------------------------

interface ShopSeed {
  name: string;
  slug: string;
  description: string;
  address: string;
  adminEmail: string;
  adminPassword: string;
  contact: { type: string; value: string };
  social: { platform: string; url: string };
}

const SHOPS: ShopSeed[] = [
  {
    name: 'Acme Electronics',
    slug: 'acme-electronics',
    description: 'Gadgets and gear for everyone.',
    address: '123 Market St',
    adminEmail: 'owner@acme.test',
    adminPassword: 'ShopAdmin123!',
    contact: { type: 'phone', value: '+976 9911 2233' },
    social: { platform: 'instagram', url: 'https://instagram.com/acme' },
  },
  {
    name: 'Trendy Threads',
    slug: 'trendy-threads',
    description: 'Streetwear and sneakers.',
    address: '500 Fashion Ave',
    adminEmail: 'owner@trendy.test',
    adminPassword: 'ShopAdmin123!',
    contact: { type: 'whatsapp', value: '+976 8800 1122' },
    social: { platform: 'facebook', url: 'https://facebook.com/trendythreads' },
  },
  {
    name: 'Home Haven',
    slug: 'home-haven',
    description: 'Everything for a cozy home.',
    address: '78 Comfort Rd',
    adminEmail: 'owner@homehaven.test',
    adminPassword: 'ShopAdmin123!',
    contact: { type: 'phone', value: '+976 9090 3344' },
    social: { platform: 'instagram', url: 'https://instagram.com/homehaven' },
  },
  {
    name: 'Glow Beauty',
    slug: 'glow-beauty',
    description: 'Skincare, makeup and fragrances.',
    address: '12 Radiance Blvd',
    adminEmail: 'owner@glow.test',
    adminPassword: 'ShopAdmin123!',
    contact: { type: 'whatsapp', value: '+976 8811 5566' },
    social: { platform: 'facebook', url: 'https://facebook.com/glowbeauty' },
  },
  {
    name: 'Peak Outdoors',
    slug: 'peak-outdoors',
    description: 'Gear up for every adventure.',
    address: '9 Summit Way',
    adminEmail: 'owner@peak.test',
    adminPassword: 'ShopAdmin123!',
    contact: { type: 'phone', value: '+976 9933 7788' },
    social: { platform: 'telegram', url: 'https://t.me/peakoutdoors' },
  },
];

// --- Banners ------------------------------------------------------------------

// Promotional banners shown at the top of the home feed. Images are sized to
// the carousel's 16:6 aspect ratio.
const BANNERS: {
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
}[] = [
  {
    title: 'Mega Electronics Sale',
    imageUrl: 'https://picsum.photos/seed/banner-electronics/1280/480',
    linkUrl: '/category/electronics',
    position: 1,
  },
  {
    title: 'Fresh Fashion Drops',
    imageUrl: 'https://picsum.photos/seed/banner-fashion/1280/480',
    linkUrl: '/category/fashion',
    position: 2,
  },
  {
    title: 'Glow Up: Beauty Picks',
    imageUrl: 'https://picsum.photos/seed/banner-beauty/1280/480',
    linkUrl: '/category/beauty-personal-care',
    position: 3,
  },
  {
    title: 'Gear Up for the Outdoors',
    imageUrl: 'https://picsum.photos/seed/banner-outdoors/1280/480',
    linkUrl: '/category/sports-outdoors',
    position: 4,
  },
];

// --- Helpers ------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  // --- Super admin (from env) ------------------------------------------------
  const superEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@zagvar.local';
  const superPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const superName = process.env.SEED_SUPER_ADMIN_NAME ?? 'Super Admin';

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: superEmail },
    update: {},
    create: {
      email: superEmail,
      passwordHash: await bcrypt.hash(superPassword, BCRYPT_ROUNDS),
      name: superName,
    },
  });
  console.log(`Super admin ready: ${superAdmin.email}`);

  // --- Categories ------------------------------------------------------------
  const categoryBySlug = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    categoryBySlug.set(cat.slug, created.id);
  }
  console.log(`Categories ready: ${categoryBySlug.size}`);

  // --- Subcategories ---------------------------------------------------------
  // Map of "categorySlug/subSlug" -> subcategory id, plus category id.
  const subcatIndex = new Map<string, { id: string; categoryId: string }>();

  async function seedSubcategories(
    categorySlug: string,
    subs: { name: string; slug: string }[],
  ): Promise<void> {
    const categoryId = categoryBySlug.get(categorySlug);
    if (!categoryId) return;
    for (const sub of subs) {
      const created = await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId, slug: sub.slug } },
        update: { name: sub.name },
        create: { categoryId, name: sub.name, slug: sub.slug },
      });
      subcatIndex.set(`${categorySlug}/${sub.slug}`, { id: created.id, categoryId });
    }
  }

  await seedSubcategories('electronics', ELECTRONICS_SUBCATEGORIES);
  for (const [categorySlug, subs] of Object.entries(OTHER_SUBCATEGORIES)) {
    await seedSubcategories(categorySlug, subs);
  }
  console.log(`Subcategories ready: ${subcatIndex.size}`);

  // --- Shops & admins --------------------------------------------------------
  const shopIdBySlug = new Map<string, string>();
  for (const s of SHOPS) {
    const shop = await prisma.shop.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description, address: s.address },
      create: {
        name: s.name,
        slug: s.slug,
        description: s.description,
        address: s.address,
        contacts: { create: s.contact },
        socials: { create: s.social },
      },
    });
    shopIdBySlug.set(s.slug, shop.id);

    await prisma.shopAdmin.upsert({
      where: { email: s.adminEmail },
      update: {},
      create: {
        shopId: shop.id,
        email: s.adminEmail,
        passwordHash: await bcrypt.hash(s.adminPassword, BCRYPT_ROUNDS),
        name: `${s.name} Owner`,
      },
    });
    console.log(`Shop ready: ${shop.slug} (admin: ${s.adminEmail})`);
  }

  // --- Products --------------------------------------------------------------
  // Generate many products across every Electronics subcategory plus a spread
  // of other categories/subcategories. Each is upserted on (shopId, slug) so
  // re-running the seed is idempotent.
  const shopSlugs = [...shopIdBySlug.keys()];

  interface ProductSeed {
    name: string;
    shopSlug: string;
    categorySlug: string;
    subSlug?: string;
    price: number;
  }

  const products: ProductSeed[] = [];

  // Two products per Electronics subcategory (40 products).
  const electronicsModels: Record<string, [string, string]> = {
    smartphones: ['Aurora X1 Smartphone', 'Nimbus Pro Smartphone'],
    laptops: ['Stratus 14 Laptop', 'Quantum 16 Laptop'],
    tablets: ['Slate 11 Tablet', 'Canvas Mini Tablet'],
    'desktop-computers': ['Forge Tower PC', 'Compact Cube PC'],
    monitors: ['ClearView 27" Monitor', 'UltraWide 34" Monitor'],
    keyboards: ['TactilePro Keyboard', 'SilentType Keyboard'],
    mice: ['Glide Wireless Mouse', 'Precision Gaming Mouse'],
    headphones: ['SilentWave Headphones', 'BassBoost Headphones'],
    speakers: ['RoomFill Speaker', 'PocketBoom Speaker'],
    cameras: ['Lumen DSLR Camera', 'GoSnap Action Camera'],
    smartwatches: ['Pulse Smartwatch', 'FitTrack Smartwatch'],
    televisions: ['Vivid 55" 4K TV', 'Vivid 65" OLED TV'],
    printers: ['SwiftJet Printer', 'LaserPro Printer'],
    'routers-networking': ['MeshLink Router', 'GigaWave Router'],
    'external-storage': ['Vault 2TB SSD', 'Capsule 4TB HDD'],
    'power-banks': ['ChargeMax 20000 Power Bank', 'SlimCell 10000 Power Bank'],
    'chargers-cables': ['RapidCharge 65W Adapter', 'BraidedLink USB-C Cable'],
    drones: ['SkyEye Drone', 'AeroSnap Mini Drone'],
    projectors: ['CinemaCast Projector', 'PocketBeam Projector'],
    'gaming-consoles': ['NovaPlay Console', 'Handheld NovaPlay Go'],
  };

  let i = 0;
  for (const sub of ELECTRONICS_SUBCATEGORIES) {
    const [a, b] = electronicsModels[sub.slug] ?? [`${sub.name} A`, `${sub.name} B`];
    for (const name of [a, b]) {
      products.push({
        name,
        shopSlug: shopSlugs[i % shopSlugs.length],
        categorySlug: 'electronics',
        subSlug: sub.slug,
        price: Math.round((49 + (i % 30) * 37.5) * 100) / 100,
      });
      i++;
    }
  }

  // Fashion products.
  const fashionProducts: [string, string][] = [
    ['Cloud Runner Sneakers', 'sneakers'],
    ['Trail Blazer Sneakers', 'sneakers'],
    ['Everyday Cotton T-Shirt', 't-shirts'],
    ['Graphic Print T-Shirt', 't-shirts'],
    ['Slim Fit Jeans', 'jeans'],
    ['Relaxed Denim Jeans', 'jeans'],
    ['Windbreaker Jacket', 'jackets'],
    ['Quilted Winter Jacket', 'jackets'],
    ['Summer Floral Dress', 'dresses'],
    ['Evening Maxi Dress', 'dresses'],
  ];
  fashionProducts.forEach(([name, subSlug], idx) => {
    products.push({
      name,
      shopSlug: 'trendy-threads',
      categorySlug: 'fashion',
      subSlug,
      price: Math.round((19.99 + idx * 12) * 100) / 100,
    });
  });

  // Home & kitchen products.
  const homeProducts: [string, string][] = [
    ['Nonstick Frying Pan Set', 'cookware'],
    ['Cast Iron Dutch Oven', 'cookware'],
    ['Stand Mixer 5L', 'small-appliances'],
    ['Espresso Machine', 'small-appliances'],
    ['16-Piece Dinnerware Set', 'dinnerware'],
    ['Bamboo Serving Bowls', 'dinnerware'],
    ['Cotton Duvet Cover Set', 'bedding'],
    ['Memory Foam Pillow', 'bedding'],
  ];
  homeProducts.forEach(([name, subSlug], idx) => {
    products.push({
      name,
      shopSlug: 'home-haven',
      categorySlug: 'home-kitchen',
      subSlug,
      price: Math.round((24.5 + idx * 18) * 100) / 100,
    });
  });

  // Beauty products.
  const beautyProducts: [string, string][] = [
    ['Hydrating Face Serum', 'skincare'],
    ['Vitamin C Moisturizer', 'skincare'],
    ['Matte Lipstick Set', 'makeup'],
    ['Everyday Eyeshadow Palette', 'makeup'],
    ['Argan Repair Shampoo', 'hair-care'],
    ['Leave-In Hair Conditioner', 'hair-care'],
    ['Citrus Bloom Eau de Parfum', 'fragrances'],
    ['Amber Woods Cologne', 'fragrances'],
  ];
  beautyProducts.forEach(([name, subSlug], idx) => {
    products.push({
      name,
      shopSlug: 'glow-beauty',
      categorySlug: 'beauty-personal-care',
      subSlug,
      price: Math.round((12.99 + idx * 9.5) * 100) / 100,
    });
  });

  // Sports & outdoors products.
  const sportsProducts: [string, string][] = [
    ['Adjustable Dumbbell Set', 'fitness-equipment'],
    ['Yoga Mat Pro', 'fitness-equipment'],
    ['4-Person Camping Tent', 'camping-gear'],
    ['Sleeping Bag -5°C', 'camping-gear'],
    ['Mountain Bike 21-Speed', 'cycling'],
    ['Cycling Helmet', 'cycling'],
  ];
  sportsProducts.forEach(([name, subSlug], idx) => {
    products.push({
      name,
      shopSlug: 'peak-outdoors',
      categorySlug: 'sports-outdoors',
      subSlug,
      price: Math.round((29.99 + idx * 40) * 100) / 100,
    });
  });

  // Gaming products (category-only / subcategory mix).
  const gamingProducts: [string, string][] = [
    ['Galaxy Quest (PC)', 'pc-games'],
    ['Speed Legends (PC)', 'pc-games'],
    ['Dragon Realms (Console)', 'console-games'],
    ['Arena Champions (Console)', 'console-games'],
    ['Pro Gaming Controller', 'gaming-accessories'],
    ['RGB Gaming Headset', 'gaming-accessories'],
  ];
  gamingProducts.forEach(([name, subSlug], idx) => {
    products.push({
      name,
      shopSlug: 'acme-electronics',
      categorySlug: 'gaming',
      subSlug,
      price: Math.round((19.99 + idx * 15) * 100) / 100,
    });
  });

  let created = 0;
  for (const p of products) {
    const shopId = shopIdBySlug.get(p.shopSlug);
    const categoryId = categoryBySlug.get(p.categorySlug) ?? null;
    const subcategoryId = p.subSlug
      ? (subcatIndex.get(`${p.categorySlug}/${p.subSlug}`)?.id ?? null)
      : null;
    if (!shopId) continue;

    const slug = slugify(p.name);
    await prisma.product.upsert({
      where: { shopId_slug: { shopId, slug } },
      update: { price: p.price, categoryId, subcategoryId },
      create: {
        shopId,
        categoryId,
        subcategoryId,
        name: p.name,
        slug,
        price: p.price,
        description: `${p.name} — quality product available now.`,
        images: {
          create: [
            { url: `https://picsum.photos/seed/${slug}/600/600`, position: 0 },
            { url: `https://picsum.photos/seed/${slug}-2/600/600`, position: 1 },
          ],
        },
      },
    });
    created++;
  }
  console.log(`Products ready: ${created}`);

  // --- Banners ---------------------------------------------------------------
  // Banners have no natural unique key, so clear and recreate for idempotency.
  await prisma.banner.deleteMany({});
  await prisma.banner.createMany({ data: BANNERS });
  console.log(`Banners ready: ${BANNERS.length}`);

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
