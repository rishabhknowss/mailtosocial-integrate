"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/app/types/types";

export default function ProductCard({ product }: { product: Product }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkoutProduct = async (productId: string, is_recurring: boolean) => {
    setLoading(true);
    try {
      const productType = is_recurring ? "subscription" : "onetime";
      
      const response = await fetch(`/api/payments/checkout/${productType}?productId=${productId}`, {
        cache: "no-store",
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const data = await response.json();
      router.push(data.payment_link);
    } catch (error) {
      console.error("Checkout error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 hover:transform hover:scale-105 hover:shadow-xl transition-all duration-300">
      <h2 className="text-xl font-bold text-black">{product.name}</h2>
      <p className="text-gray-700 mt-2">{product.description}</p>
      <p className="text-green-600 font-semibold mt-4">${(product.price / 100).toFixed(2)}</p>
      <button
        className="mt-4 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300"
        onClick={() => checkoutProduct(product.product_id, product.is_recurring)}
        disabled={loading}
      >
        {loading ? "Processing..." : product.is_recurring ? "Subscribe Now" : "Buy Now"}
      </button>
    </div>
  );
} 