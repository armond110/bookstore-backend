import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Book from "./models/Book.js";
import User from "./models/User.js";

dotenv.config();

const books = [
  {
    title: "The Silent Cartographer",
    author: "Elena Marsh",
    description: "A mapmaker discovers a city that redraws itself every night.",
    price: 16.99,
    genre: "Fiction",
    stock: 24,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Silent%20Cartographer",
    rating: 4.5,
    featured: true,
  },
  {
    title: "Learning Deep Systems",
    author: "R. K. Osei",
    description: "A practical guide to building and reasoning about complex software.",
    price: 34.5,
    genre: "Technology",
    stock: 15,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Learning%20Deep%20Systems",
    rating: 4.7,
    featured: true,
  },
  {
    title: "Salt and Ember",
    author: "Priya Chandran",
    description: "A coastal family saga spanning three generations of fishermen.",
    price: 14.25,
    genre: "Fiction",
    stock: 30,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Salt%20and%20Ember",
    rating: 4.2,
    featured: false,
  },
  {
    title: "The Quiet Economist",
    author: "Marcus Feldt",
    description: "Rethinking everyday decisions through the lens of behavioral economics.",
    price: 21.0,
    genre: "Non-Fiction",
    stock: 18,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Quiet%20Economist",
    rating: 4.0,
    featured: true,
  },
  {
    title: "Orbit of Ashes",
    author: "Nadia Volkov",
    description: "A generation ship's last engineer fights to keep humanity's dream alive.",
    price: 18.75,
    genre: "Science Fiction",
    stock: 20,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Orbit%20of%20Ashes",
    rating: 4.8,
    featured: false,
  },
  {
    title: "The Kitchen Table Atlas",
    author: "Sofia Renner",
    description: "Recipes and stories collected from twenty family kitchens around the world.",
    price: 27.99,
    genre: "Cooking",
    stock: 12,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Kitchen%20Table%20Atlas",
    rating: 4.6,
    featured: false,
  },
  {
    title: "Codebreakers",
    author: "Daniel Whitfield",
    description: "The untold story of the cryptographers who shortened a war.",
    price: 22.5,
    genre: "Non-Fiction",
    stock: 16,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Codebreakers",
    rating: 4.4,
    featured: true,
  },
  {
    title: "Whispers of the Forest",
    author: "Elena Marsh",
    description: "A young ranger uncovers a language spoken only by the oldest trees.",
    price: 15.5,
    genre: "Fiction",
    stock: 22,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Whispers%20of%20the%20Forest",
    rating: 4.3,
    featured: false,
  },
  {
    title: "The Last Lighthouse",
    author: "Priya Chandran",
    description: "A keeper refuses to leave her post as the coastline slowly disappears.",
    price: 17.0,
    genre: "Fiction",
    stock: 19,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Last%20Lighthouse",
    rating: 4.5,
    featured: false,
  },
  {
    title: "Midnight Garden",
    author: "Sofia Renner",
    description: "A locked garden only opens after dark, and only to those who need it most.",
    price: 15.99,
    genre: "Fiction",
    stock: 25,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Midnight%20Garden",
    rating: 4.1,
    featured: false,
  },
  {
    title: "The Long Way Home",
    author: "Marcus Feldt",
    description: "A soldier's decade-long journey back to a country that has moved on without him.",
    price: 19.25,
    genre: "Fiction",
    stock: 14,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Long%20Way%20Home",
    rating: 4.6,
    featured: false,
  },
  {
    title: "Systems That Scale",
    author: "R. K. Osei",
    description: "How to design backend systems that survive real-world traffic.",
    price: 38.0,
    genre: "Technology",
    stock: 10,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Systems%20That%20Scale",
    rating: 4.9,
    featured: true,
  },
  {
    title: "The Pragmatic Database",
    author: "Daniel Whitfield",
    description: "A no-nonsense guide to modeling data for applications that last.",
    price: 32.0,
    genre: "Technology",
    stock: 13,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Pragmatic%20Database",
    rating: 4.5,
    featured: false,
  },
  {
    title: "Orbit of Silence",
    author: "Nadia Volkov",
    description: "A deep-space listening station picks up a signal that shouldn't exist.",
    price: 19.99,
    genre: "Science Fiction",
    stock: 17,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Orbit%20of%20Silence",
    rating: 4.7,
    featured: false,
  },
  {
    title: "The Cartographer's Daughter",
    author: "Elena Marsh",
    description: "She inherits her father's maps — and the secrets drawn into their margins.",
    price: 16.5,
    genre: "Fiction",
    stock: 21,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Cartographer%27s%20Daughter",
    rating: 4.4,
    featured: false,
  },
  {
    title: "Behavioral Ledger",
    author: "Marcus Feldt",
    description: "Why smart people make predictably irrational financial choices.",
    price: 23.5,
    genre: "Non-Fiction",
    stock: 15,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Behavioral%20Ledger",
    rating: 4.2,
    featured: false,
  },
  {
    title: "The Spice Route Kitchen",
    author: "Sofia Renner",
    description: "A cook's journey retracing ancient trade routes, one dish at a time.",
    price: 29.5,
    genre: "Cooking",
    stock: 11,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Spice%20Route%20Kitchen",
    rating: 4.6,
    featured: false,
  },
  {
    title: "Fires We Carry",
    author: "Priya Chandran",
    description: "Three sisters, one inherited house, and the fire that keeps almost taking it.",
    price: 15.25,
    genre: "Fiction",
    stock: 18,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Fires%20We%20Carry",
    rating: 4.3,
    featured: false,
  },
  {
    title: "The Signal and the Ash",
    author: "Nadia Volkov",
    description: "After the collapse, a radio engineer becomes the last voice anyone trusts.",
    price: 18.0,
    genre: "Science Fiction",
    stock: 20,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=The%20Signal%20and%20the%20Ash",
    rating: 4.5,
    featured: false,
  },
  {
    title: "Notes on Attention",
    author: "Daniel Whitfield",
    description: "A short, practical book about focus in a world built to fracture it.",
    price: 17.75,
    genre: "Non-Fiction",
    stock: 26,
    coverImage: "https://placehold.co/400x600/0F2818/F3F1E8?font=playfair-display&text=Notes%20on%20Attention",
    rating: 4.1,
    featured: false,
  },
];

async function seed() {
  await connectDB();

  await Book.deleteMany();
  await Book.insertMany(books);
  console.log(`Seeded ${books.length} books`);

  const adminEmail = "admin@bookstore.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "Store Admin",
      email: adminEmail,
      password: "admin1234",
      role: "admin",
    });
    console.log(`Created admin user -> email: ${adminEmail}, password: admin1234`);
  }

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
