import { FC } from 'react';

interface ProductCardProps {
  title: string;
  price: number;
  description: string;
  features: string[];
  priceId: string;
  popular?: boolean;
}

export const ProductCard: FC<ProductCardProps> = ({
  title,
  price,
  description,
  features,
  priceId,
  popular = false,
}) => {
  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div className={`relative rounded-2xl p-8 ${popular ? 'bg-blue-600' : 'bg-[#2a2a2a]'}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{description}</p>
        
        <div className="mb-6">
          <span className="text-4xl font-bold text-white">${price}</span>
          <span className="text-gray-300">/month</span>
        </div>
        
        <button
          onClick={handleSubscribe}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            popular
              ? 'bg-white text-blue-600 hover:bg-gray-100'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Subscribe Now
        </button>
      </div>
      
      <div className="mt-8">
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-gray-300">
              <svg
                className={`w-5 h-5 mr-3 ${popular ? 'text-white' : 'text-blue-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}; 