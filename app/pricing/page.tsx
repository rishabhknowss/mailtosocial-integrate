"use client";
import Modal from '../components/Modal';
import { ProductCard } from '../components/ProductCard';

export default function PricingModal() {
  return (
    <Modal title="Choose Your Plan">
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Unlock Premium Features
          </h1>
          <p className="text-xl text-gray-300">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-3 lg:gap-8">
          <ProductCard
            title="Basic"
            price={9.99}
            description="Perfect for individuals and small projects"
            features={[
              "100 Email to Social Media Conversions",
              "Basic Analytics",
              "Standard Support",
              "1 Social Platform"
            ]}
            priceId="pdt_yr0qRoGoC4R61tDOcfzih"
            popular={false}
          />

          <ProductCard
            title="Pro"
            price={19.99}
            description="Ideal for growing businesses"
            features={[
              "500 Email to Social Media Conversions",
              "Advanced Analytics",
              "Priority Support",
              "3 Social Platforms",
              "Custom Templates"
            ]}
            priceId="pdt_Gwj6P6l1h"
            popular={true}
          />

          <ProductCard
            title="Enterprise"
            price={49.99}
            description="For large scale operations"
            features={[
              "Unlimited Conversions",
              "Enterprise Analytics",
              "24/7 Premium Support",
              "All Social Platforms",
              "Custom Templates",
              "API Access"
            ]}
            priceId="pdt_Gwj6P61hl"
            popular={false}
          />
        </div>
      </div>
    </Modal>
  );
} 