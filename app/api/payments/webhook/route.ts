import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { dodopayments } from "@/lib/dodopayments";
import db from "../../../../prisma/db";

// Define a simple interface for the webhook payload
interface WebhookPayload {
  type: string;
  data: {
    customerId: string;
    status?: string;
    metadata?: {
      userId: string;
    };
    payload_type: 'Subscription' | 'Payment';
    subscription_id?: string;
    payment_id?: string;
    customer_id?: string;
  };
}

// Create webhook instance with your secret key from Dodo Payments Dashboard
const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);

export async function POST(request: Request) {
  const headersList = headers();

  try {
    const rawBody = await request.text();
    const webhookHeaders = {
      "webhook-id": (await headersList).get("webhook-id") || "",
      "webhook-signature": (await headersList).get("webhook-signature") || "",
      "webhook-timestamp": (await headersList).get("webhook-timestamp") || "",
    };

    console.log("Webhook headers:", webhookHeaders);
    console.log("Webhook raw body:", rawBody.substring(0, 100) + "...");

    try {
      await webhook.verify(rawBody, webhookHeaders);
      console.log("Webhook signature verified successfully");
    } catch (error) {
      console.log(" ----- webhook verification failed -----");
      console.log(error);
      // Still return 200 to acknowledge receipt
      return Response.json(
        { message: "Webhook processed successfully" },
        { status: 200 }
      );
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    console.log("Webhook event type:", payload.type);

    if (payload.data.payload_type === "Subscription") {
      switch (payload.type) {
        case "subscription.active":
          const subscription = await dodopayments.subscriptions.retrieve(payload.data.subscription_id || '');
          console.log("-------SUBSCRIPTION DATA START ---------");
          console.log(subscription);
          console.log("-------SUBSCRIPTION DATA END ---------");
          
          // Update user subscription in database
          if (subscription && subscription.metadata && subscription.metadata.userId) {
            const userId = subscription.metadata.userId;
            
            // Check if subscription already exists
            const existingSubscription = await db.subscription.findUnique({
              where: { userId },
            });
            
            if (existingSubscription) {
              console.log(`Updating existing subscription for user ${userId}`);
              await db.subscription.update({
                where: { userId },
                data: {
                  status: 'active',
                  updatedAt: new Date(),
                },
              });
            } else {
              console.log(`Creating new subscription for user ${userId}`);
              await db.subscription.create({
                data: {
                  userId,
                  status: 'active',
                  customerId: payload.data.customerId || 'unknown'
                },
              });
            }
          } else {
            console.error("Missing userId in subscription metadata");
          }
          break;
          
        case "subscription.failed":
          await updateSubscriptionStatus(payload, 'failed');
          break;
          
        case "subscription.cancelled":
          await updateSubscriptionStatus(payload, 'cancelled');
          break;
          
        case "subscription.renewed":
          await updateSubscriptionStatus(payload, 'active');
          break;
          
        case "subscription.on_hold":
          await updateSubscriptionStatus(payload, 'on_hold');
          break;
          
        default:
          console.log(`Unhandled subscription event: ${payload.type}`);
          break;
      }
    } else if (payload.data.payload_type === "Payment") {
      switch (payload.type) {
        case "payment.succeeded":
          const paymentDataResp = await dodopayments.payments.retrieve(payload.data.payment_id || '');
          console.log("-------PAYMENT DATA START ---------");
          console.log(paymentDataResp);
          console.log("-------PAYMENT DATA END ---------");
          
          // Process payment and update subscription if needed
          if (paymentDataResp && paymentDataResp.metadata && paymentDataResp.metadata.userId) {
            const userId = paymentDataResp.metadata.userId;
            
            // Check if subscription already exists
            const existingSubscription = await db.subscription.findUnique({
              where: { userId },
            });
            
            if (existingSubscription) {
              console.log(`Updating existing subscription for user ${userId} after payment`);
              await db.subscription.update({
                where: { userId },
                data: {
                  status: 'active',
                  updatedAt: new Date(),
                },
              });
            } else {
              console.log(`Creating new subscription for user ${userId} after payment`);
              await db.subscription.create({
                data: {
                  userId,
                  status: 'active',
                  customerId: payload.data.customerId || 'unknown'
                },
              });
            }
          } else {
            console.error("Missing userId in payment metadata");
          }
          break;
          
        default:
          console.log(`Unhandled payment event: ${payload.type}`);
          break;
      }
    }
    
    return Response.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(" ----- webhook processing failed -----");
    console.log(error);
    return Response.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  }
}

// Helper function to update subscription status
async function updateSubscriptionStatus(payload: WebhookPayload, status: string) {
  try {
    if (!payload.data.subscription_id) {
      console.error("Missing subscription_id in webhook payload");
      return;
    }
    
    const subscription = await dodopayments.subscriptions.retrieve(payload.data.subscription_id || '');
    
    if (!subscription || !subscription.metadata || !subscription.metadata.userId) {
      console.error("Missing userId in subscription metadata");
      return;
    }
    
    const userId = subscription.metadata.userId;
    
    // Update subscription status
    const existingSubscription = await db.subscription.findUnique({
      where: { userId },
    });
    
    if (existingSubscription) {
      console.log(`Updating subscription status to ${status} for user ${userId}`);
      await db.subscription.update({
        where: { userId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } else {
      console.log(`Creating new subscription with status ${status} for user ${userId}`);
      await db.subscription.create({
        data: {
          userId,
          status,
          customerId: payload.data.customerId || 'unknown'
        },
      });
    }
  } catch (error) {
    console.error(`Error updating subscription status to ${status}:`, error);
  }
}