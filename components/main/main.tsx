/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';/**
 * Libistrick — Enhanced Single-file React + TypeScript Shop
 * - Single TSX file using Tailwind CSS + Framer Motion
 * - Pink / premium visual theme, animations, and "luxury" vibe
 * - Features:
 *   - Product gallery with image gallery, variants, and real Unsplash images
 *   - Cart with add/remove/update, persisted to localStorage
 *   - Wishlist (favourites)
 *   - Promo codes (example: LIBISAVE10 => 10% off)
 *   - Shipping options and tax estimation
 *   - Checkout modal with customer form that posts to a Google Sheets Web App (Apps Script)
 *   - Basic client-side validation and success/error feedback
 * - To use: Drop this file into a React + TypeScript app configured with Tailwind CSS and Framer Motion.
 *   - Install framer-motion: npm install framer-motion
 *   - Ensure Tailwind is configured and working in your app.
 *
 * Replace WEBHOOK_URL with your Google Apps Script Web App URL (see sample script below).
 *
 * Google Apps Script sample:
 * ---------------------------------------------------------
 * const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
 * function doPost(e) {
 *   try {
 *     const ss = SpreadsheetApp.openById(SHEET_ID);
 *     const sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
 *     const body = e.postData.contents ? JSON.parse(e.postData.contents) : {};
 *     const headers = ['timestamp','name','email','phone','address','items','subtotal','shipping','tax','discount','total','notes'];
 *     if (sheet.getLastRow() === 0) sheet.appendRow(headers);
 *     const row = [
 *       new Date(),
 *       body.name || '',
 *       body.email || '',
 *       body.phone || '',
 *       body.address || '',
 *       JSON.stringify(body.items || []),
 *       body.subtotal || 0,
 *       body.shipping || 0,
 *       body.tax || 0,
 *       body.discount || 0,
 *       body.total || 0,
 *       body.notes || ''
 *     ];
 *     sheet.appendRow(row);
 *     return ContentService.createTextOutput(JSON.stringify({status:'success'})).setMimeType(ContentService.MimeType.JSON);
 *   } catch (err) {
 *     return ContentService.createTextOutput(JSON.stringify({status:'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * ---------------------------------------------------------
 *
 * Notes:
 * - For production, secure your webhook and payment flow. This demo posts order details to a sheet for order capture only.
 * - This file intentionally bundles UI + logic for demo purposes. Split in real projects.
 */

import React, { useEffect, useMemo, useState, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ---------- CONFIG ---------- */
const WEBHOOK_URL = "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec"; // <- Replace with your Apps Script Web App URL

/* ---------- TYPES ---------- */
type Product = {
  id: string;
  name: string;
  price: number; // cents or whole dollars (we use whole dollars for demo)
  images: string[]; // gallery
  desc: string;
  color?: string;
  sku?: string;
  available?: boolean;
  variants?: { id: string; name: string; additionalPrice?: number }[];
};

type CartItem = {
  id: string; // productId + variantId maybe
  productId: string;
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  image?: string;
};

type OrderPayload = {
  name: string;
  email: string;
  phone?: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
};

/* ---------- SAMPLE PRODUCTS (premium, pink-themed visuals) ---------- */
/* Real Unsplash images provided — swap for your own high-res assets in production */
const PRODUCTS: Product[] = [
  {
    id: "libi-watch-eclipse",
    name: "Libistrick Eclipse Chrono — Rose Edition",
    price: 13990,
    images: [
      "https://liraimportltd.com/wp-content/uploads/2025/09/1689507092-wet-n-wild-megalast-liquid-catsuit-matte-lipstick-25ml-600x600.webp",
      "https://liraimportltd.com/wp-content/uploads/2025/05/wet-n-wild-megalast-lipstick-review.webp",
      "https://liraimportltd.com/wp-content/uploads/2025/08/s-l1200.jpg",
    ],
    desc: "Limited-run chronograph with rose-gold accents, sapphire crystal, and artisan leather strap. Contemporary heritage.",
    color: "Rose Gold",
    sku: "LE-001-RG",
    variants: [
      { id: "strap-leather", name: "Italian Leather Strap", additionalPrice: 0 },
      { id: "strap-rubber", name: "Performance Rubber Strap", additionalPrice: -300 },
    ],
  },
  {
    id: "libi-satchel-noir",
    name: "Libistrick Noir Satchel — Pink Lining",
    price: 8990,
    images: [
      "https://liraimportltd.com/wp-content/uploads/2025/09/1718261981e51909a78de9d0b0c52907096cf10f82-600x799.jpg",
      "https://liraimportltd.com/wp-content/uploads/2022/07/10293_PowderMatteFascination-600x600.jpg",
      "https://s.alicdn.com/@sc04/kf/H00d39349ae4949d0b35a334e36f8dabce.jpg?avif=close&webp=close"
    ],
    desc: "Hand-stitched Italian leather satchel, sculpted silhouette, with a surprise pink silk lining. Modern heritage.",
    color: "Black + Pink Lining",
    sku: "LS-002-PK",
    variants: [{ id: "default", name: "Standard", additionalPrice: 0 }],
  },
  {
    id: "libi-scarf-silk",
    name: "Libistrick Silk Drape — Petal",
    price: 499,
    images: [
      "https://s.alicdn.com/@sc04/kf/Hb569a71f3d9f45db9812e3dcde3bffbeH.jpg?avif=close&webp=close",
      "https://s.alicdn.com/@sc04/kf/Ha5e80d9a6ed147649d6d7ff127dc2701d.jpg?avif=close&webp=close",
      'https://s.alicdn.com/@sc04/kf/H6d411cbdfdab49cbbe542570d3c510dcQ.jpg?avif=close&webp=close'
    ],
    desc: "Pure silk drape with hand-painted gradients inspired by the first light of dawn.",
    color: "Petal Pink",
    sku: "LSC-003-P",
    variants: [
      { id: "small", name: "Small (60cm)", additionalPrice: 0 },
      { id: "large", name: "Large (120cm)", additionalPrice: 120 },
    ],
  },
];

/* ---------- HELPERS ---------- */
const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const LOCAL_CART_KEY = "libistrick_cart_v1";
const LOCAL_WISHLIST_KEY = "libistrick_wishlist_v1";
const LOCAL_PROMO_KEY = "libistrick_promo_v1";

/* Promo rules */
const PROMOS: Record<string, { percent: number; desc: string }> = {
  LIBISAVE10: { percent: 10, desc: "10% off — Libistrick welcome" },
  PETAL5: { percent: 5, desc: "5% off Petal collection" },
};

/* Tax & shipping placeholder rates */
const TAX_RATE = 0.08; // 8%
const SHIPPING_OPTIONS = [
  { id: "standard", name: "Standard (5-8 days)", price: 12 },
  { id: "express", name: "Express (2-3 days)", price: 35 },
];

/* ---------- MAIN COMPONENT ---------- */
export default function LibistrickShop(): JSX.Element {
  /* UI state */
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    PRODUCTS[0].variants?.[0]?.id
  );
  const [qty, setQty] = useState<number>(1);

  /* Cart and wishlist persisted to localStorage */
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_WISHLIST_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [promoCode, setPromoCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_PROMO_KEY) || "";
    } catch {
      return "";
    }
  });

  /* Checkout modal state */
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState(SHIPPING_OPTIONS[0].id);
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  /* Feedback / loading */
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(
    null
  );

  /* Persist cart/wishlist/promo to localStorage */
  useEffect(() => {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(LOCAL_PROMO_KEY, promoCode);
  }, [promoCode]);

  /* Derived values */
  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.quantity, 0),
    [cart]
  );

  const promo = useMemo(() => {
    const code = (promoCode || "").trim().toUpperCase();
    return code && PROMOS[code] ? PROMOS[code] : null;
  }, [promoCode]);

  const discount = promo ? Math.round((subtotal * promo.percent) / 100) : 0;
  const shippingPrice =
    SHIPPING_OPTIONS.find((s) => s.id === shippingMethod)?.price ?? SHIPPING_OPTIONS[0].price;
  const tax = Math.round((subtotal - discount) * TAX_RATE);
  const total = Math.max(0, subtotal - discount + shippingPrice + tax);

  /* ---------- CART ACTIONS ---------- */
  const addToCart = (product: Product, variantId?: string, quantity = 1) => {
    const variantLabel =
      variantId && product.variants?.find((v) => v.id === variantId)?.name
        ? product.variants!.find((v) => v.id === variantId)!.name
        : undefined;
    const variantExtra =
      variantId && product.variants?.find((v) => v.id === variantId)?.additionalPrice
        ? product.variants!.find((v) => v.id === variantId)!.additionalPrice!
        : 0;
    const price = product.price + (variantExtra ?? 0);
    const id = `${product.id}${variantId ? `::${variantId}` : ""}`;
    setCart((prev) => {
      const exists = prev.find((p) => p.id === id);
      if (exists) {
        return prev.map((p) => (p.id === id ? { ...p, quantity: p.quantity + quantity } : p));
      }
      return [
        ...prev,
        {
          id,
          productId: product.id,
          name: product.name + (variantLabel ? ` — ${variantLabel}` : ""),
          variant: variantLabel,
          price,
          quantity,
          image: product.images?.[0],
        },
      ];
    });
    setToast({ type: "success", message: `${product.name} added to cart.` });
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, quantity) } : p)));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCart = () => setCart([]);

  /* Wishlist */
  const toggleWishlist = (productId: string) => {
    setWishlist((s) => {
      const next = { ...s };
      if (next[productId]) delete next[productId];
      else next[productId] = true;
      return next;
    });
  };

  /* Promo apply */
  const applyPromo = (code: string) => {
    const key = code.trim().toUpperCase();
    if (!key) {
      setPromoCode("");
      setToast({ type: "info", message: "Promo cleared." });
      return;
    }
    if (!PROMOS[key]) {
      setToast({ type: "error", message: "Invalid promo code." });
      return;
    }
    setPromoCode(key);
    setToast({ type: "success", message: `Promo applied: ${PROMOS[key].desc}` });
  };

  /* Checkout submit */
  const submitOrder = async () => {
    if (!customer.name || !customer.email || !customer.address) {
      setToast({ type: "error", message: "Please fill in name, email, and address." });
      return;
    }
    if (cart.length === 0) {
      setToast({ type: "error", message: "Your cart is empty." });
      return;
    }
    const payload: OrderPayload = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      items: cart,
      subtotal,
      shipping: shippingPrice,
      tax,
      discount,
      total,
      notes: customer.notes,
    };

    setLoading(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || `Request failed: ${res.status}`);
      }
      setToast({ type: "success", message: "Order received. We'll follow up by email." });
      clearCart();
      setIsCheckoutOpen(false);
      setCustomer({ name: "", email: "", phone: "", address: "", notes: "" });
      setPromoCode("");
    } catch (err: any) {
      setToast({
        type: "error",
        message:
          err?.message ||
          "Unable to submit order. Check webhook URL, CORS, or network. For testing use a reachable Apps Script URL.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* small helper to show and auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  /* When selected product changes, reset image idx and variant */
  useEffect(() => {
    setSelectedImageIdx(0);
    setSelectedVariant(selectedProduct.variants?.[0]?.id);
  }, [selectedProduct]);

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-pink-800 to-purple-900 text-white py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: "serif" }}>
              Libistrick
            </h1>
            <p className="text-pink-200 mt-1">Petal-driven luxury — curated limited drops.</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-300 to-pink-200 text-pink-900 px-4 py-2 rounded-full font-semibold shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18v4H3zM3 10h18v11H3z" />
              </svg>
              Boutique
            </span>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="relative inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1 5a1 1 0 001 1h11" />
              </svg>
              <span className="text-sm">Cart</span>
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-pink-600 px-2 py-0.5 text-xs font-medium text-white">
                {cart.reduce((s, it) => s + it.quantity, 0)}
              </span>
            </button>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Product list */}
          <section className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRODUCTS.map((p) => (
                <motion.article
                  key={p.id}
                  whileHover={{ scale: 1.01 }}
                  className={`relative overflow-hidden rounded-2xl shadow-2xl transform transition ${selectedProduct.id === p.id ? "ring-2 ring-pink-300" : ""} bg-gradient-to-br from-white/3 to-white/2`}
                >
                  <div className="flex">
                    <img src={p.images[0]} alt={p.name} className="w-1/2 h-48 object-cover" />
                    <div className="p-4 flex-1">
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <p className="text-sm text-pink-100 mt-1">{p.desc}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xl font-bold">{currency(p.price)}</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setSelectedImageIdx(0);
                              setSelectedVariant(p.variants?.[0]?.id);
                            }}
                            className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-400 text-white text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => toggleWishlist(p.id)}
                            className={`p-2 rounded-lg ${wishlist[p.id] ? "bg-pink-600 text-white" : "bg-white/5 text-pink-200"}`}
                          >
                            {wishlist[p.id] ? "♥" : "♡"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Selected product detail (gallery + actions) */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-3xl bg-gradient-to-br from-white/5 to-white/3 p-6 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-900/40 to-transparent p-2">
                    <img
                      src={selectedProduct.images[selectedImageIdx]}
                      alt={selectedProduct.name}
                      className="w-full h-80 object-cover rounded-xl"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {selectedProduct.images.map((img, i) => (
                      <button
                        key={img}
                        onClick={() => setSelectedImageIdx(i)}
                        className={`w-20 h-14 rounded-lg overflow-hidden border-2 ${selectedImageIdx === i ? "border-pink-400" : "border-transparent"}`}
                      >
                        <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold">{selectedProduct.name}</h2>
                  <div className="text-pink-100 mt-2">{selectedProduct.color} • {selectedProduct.sku}</div>
                  <p className="mt-4 text-pink-50">{selectedProduct.desc}</p>

                  <div className="mt-4">
                    <div className="text-sm text-pink-200">Choose variant</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {selectedProduct.variants?.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v.id)}
                          className={`px-3 py-2 rounded-md text-sm ${selectedVariant === v.id ? "bg-pink-500 text-white" : "bg-white/5 text-pink-100"}`}
                        >
                          {v.name}{v.additionalPrice ? ` (+${currency(v.additionalPrice)})` : ""}
                        </button>
                      ))}

                      {!selectedProduct.variants && <div className="text-sm text-pink-200">Default</div>}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/6 rounded-lg px-3 py-2">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="text-2xl leading-none px-2"
                      >
                        −
                      </button>
                      <div className="w-12 text-center">{qty}</div>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="text-2xl leading-none px-2"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-2xl font-bold">{currency(selectedProduct.price + (selectedProduct.variants?.find(v=>v.id===selectedVariant)?.additionalPrice ?? 0))}</div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={() => addToCart(selectedProduct, selectedVariant, qty)}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-400 to-pink-300 text-pink-900 font-semibold shadow-lg"
                    >
                      Add to cart
                    </button>

                    <button
                      onClick={() => {
                        addToCart(selectedProduct, selectedVariant, qty);
                        setIsCheckoutOpen(true);
                      }}
                      className="px-4 py-3 rounded-lg border border-white/10 text-sm text-pink-100"
                    >
                      Buy now
                    </button>

                    <button
                      onClick={() => toggleWishlist(selectedProduct.id)}
                      className={`px-3 py-3 rounded-lg ${wishlist[selectedProduct.id] ? "bg-pink-600 text-white" : "bg-white/5 text-pink-100"}`}
                    >
                      {wishlist[selectedProduct.id] ? "♥ Wishlisted" : "♡ Wishlist"}
                    </button>
                  </div>

                  <div className="mt-4 text-sm text-pink-200">
                    Ships worldwide • Complimentary gift wrap available on request
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Right column: Cart & Checkout summary */}
          <aside className="space-y-4">
            <div className="rounded-2xl p-4 bg-white/5 shadow-lg">
              <h3 className="text-lg font-semibold">Cart</h3>

              <div className="mt-3 space-y-3">
                {cart.length === 0 && <div className="text-sm text-pink-200">Your cart is empty</div>}
                {cart.map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    <img src={it.image} alt={it.name} className="w-14 h-14 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-pink-200">{currency(it.price)} • Qty {it.quantity}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => updateCartQuantity(it.id, it.quantity - 1)} className="px-2 py-1 bg-white/5 rounded">−</button>
                        <button onClick={() => updateCartQuantity(it.id, it.quantity + 1)} className="px-2 py-1 bg-white/5 rounded">+</button>
                        <button onClick={() => removeFromCart(it.id)} className="px-2 py-1 text-xs text-pink-100">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="mt-4 border-t border-white/6 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <div>Subtotal</div>
                      <div>{currency(subtotal)}</div>
                    </div>

                    <div className="flex justify-between">
                      <div>Discount</div>
                      <div>-{currency(discount)}</div>
                    </div>

                    <div className="flex justify-between">
                      <div>Shipping</div>
                      <div>{currency(shippingPrice)}</div>
                    </div>

                    <div className="flex justify-between">
                      <div>Tax</div>
                      <div>{currency(tax)}</div>
                    </div>

                    <div className="flex justify-between font-bold text-lg">
                      <div>Total</div>
                      <div>{currency(total)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <button onClick={() => setIsCheckoutOpen(true)} className="px-4 py-3 rounded-lg bg-gradient-to-r from-pink-400 to-pink-300 text-pink-900 font-semibold">
                      Checkout
                    </button>
                    <button onClick={() => clearCart()} className="px-4 py-3 rounded-lg border border-white/10 text-sm">Clear cart</button>
                  </div>
                </>
              )}
            </div>

            {/* Promo + Shipping selectors */}
            <div className="rounded-2xl p-4 bg-white/5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-pink-200">Have a promo?</div>
                <div className="text-sm font-semibold">{promo ? `${promo.percent}% off` : "—"}</div>
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Enter code e.g. LIBISAVE10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 rounded-md bg-white/6 px-3 py-2 outline-none"
                />
                <button onClick={() => applyPromo(promoCode)} className="px-4 py-2 rounded-md bg-pink-500 text-white">Apply</button>
              </div>

              <div className="text-sm text-pink-200">Shipping</div>
              <div className="flex gap-2">
                {SHIPPING_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShippingMethod(s.id)}
                    className={`px-3 py-2 rounded-md text-sm ${shippingMethod === s.id ? "bg-pink-500 text-white" : "bg-white/5 text-pink-100"}`}
                  >
                    {s.name} • {currency(s.price)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wishlist quick view */}
            <div className="rounded-2xl p-4 bg-white/5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Wishlist</div>
                <div className="text-sm text-pink-200">{Object.keys(wishlist).length} items</div>
              </div>

              <div className="mt-3 space-y-2">
                {Object.keys(wishlist).length === 0 && <div className="text-sm text-pink-200">No favourites yet</div>}
                {Object.keys(wishlist).map((id) => {
                  const p = PRODUCTS.find((x) => x.id === id)!;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-md" />
                      <div className="flex-1 text-sm">{p.name}</div>
                      <button onClick={() => toggleWishlist(id)} className="px-2 py-1 rounded bg-white/5">Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white/3 text-center text-pink-100">
              <div className="font-semibold">Need help?</div>
              <div className="text-sm">Contact boutique@libistrick.example — priority support for customers</div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-sm text-pink-200">
          <div className="flex items-center justify-between">
            <div>© Libistrick — Crafted with care</div>
            <div className="space-x-4">
              <span>Secure</span>
              <span>•</span>
              <span>Authentic</span>
              <span>•</span>
              <span>Worldwide</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, scale: 0.98 }}
              className="w-full max-w-3xl rounded-2xl bg-gradient-to-br from-pink-900 to-purple-900 p-6 text-white shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Checkout</h2>
                  <div className="text-pink-200 text-sm">Complete your purchase — we willll confirm with an email.</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-pink-200">{cart.length} items</div>
                  <button onClick={() => setIsCheckoutOpen(false)} className="px-3 py-2 bg-white/6 rounded-lg">Close</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="bg-white/6 rounded-lg p-4">
                    <div className="font-semibold">Contact & Shipping</div>
                    <div className="mt-3 space-y-2">
                      <input
                        placeholder="Full name"
                        value={customer.name}
                        onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                        className="w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                      />
                      <input
                        placeholder="Email"
                        value={customer.email}
                        onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                        className="w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                      />
                      <input
                        placeholder="Phone (optional)"
                        value={customer.phone}
                        onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                        className="w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                      />
                      <textarea
                        placeholder="Shipping address"
                        value={customer.address}
                        onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                        rows={3}
                        className="w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                      />
                      <input
                        placeholder="Notes (gift message)"
                        value={customer.notes}
                        onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
                        className="w-full rounded-md bg-white/5 px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-3 bg-white/6 rounded-lg p-4">
                    <div className="font-semibold">Payment</div>
                    <div className="text-sm text-pink-200 mt-2">
                      Payment processing is handled after we confirm inventory. This demo records orders to your Google Sheet endpoint.
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-white/6 rounded-lg p-4">
                    <div className="font-semibold">Order summary</div>
                    <div className="mt-3 text-sm space-y-2">
                      {cart.map((it) => (
                        <div key={it.id} className="flex items-center justify-between">
                          <div>{it.name} × {it.quantity}</div>
                          <div>{currency(it.price * it.quantity)}</div>
                        </div>
                      ))}

                      <div className="border-t border-white/6 pt-2">
                        <div className="flex justify-between">
                          <div>Subtotal</div>
                          <div>{currency(subtotal)}</div>
                        </div>
                        <div className="flex justify-between">
                          <div>Promo</div>
                          <div>-{currency(discount)}</div>
                        </div>
                        <div className="flex justify-between">
                          <div>Shipping ({shippingMethod})</div>
                          <div>{currency(shippingPrice)}</div>
                        </div>
                        <div className="flex justify-between">
                          <div>Tax</div>
                          <div>{currency(tax)}</div>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-2">
                          <div>Total</div>
                          <div>{currency(total)}</div>
                        </div>

                        <div className="mt-3">
                          <label className="text-sm text-pink-200">Choose shipping</label>
                          <div className="mt-2 flex gap-2">
                            {SHIPPING_OPTIONS.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => setShippingMethod(s.id)}
                                className={`px-3 py-2 rounded-md ${shippingMethod === s.id ? "bg-pink-500 text-white" : "bg-white/5 text-pink-100"}`}
                              >
                                {s.name} • {currency(s.price)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <button disabled={loading} onClick={submitOrder} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-pink-400 to-pink-300 text-pink-900 font-bold">
                            {loading ? "Placing order..." : `Place order • ${currency(total)}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-pink-200">
                    Orders are recorded to the configured Google Sheets webhook. Replace WEBHOOK_URL at the top of this file with your Apps Script URL.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`px-4 py-2 rounded-lg shadow-lg ${
                toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-pink-600"
              } text-white`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}