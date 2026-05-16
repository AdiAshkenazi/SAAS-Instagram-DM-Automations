import Stripe from "stripe";

const key = process.env.STRIPE_CLIENT_SECRET;
if (!key) throw new Error("STRIPE_CLIENT_SECRET is not set");

export const stripe = new Stripe(key);
