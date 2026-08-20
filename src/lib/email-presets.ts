/**
 * Ready-made copy for the one-off emails support sends when something has gone
 * wrong for a specific customer — a batch that never filled, a late order, a
 * refund that needs explaining.
 *
 * These are service emails, not campaigns: they answer an incident that has
 * already happened, so they go out regardless of marketing preferences and
 * carry no unsubscribe link. Anything list-shaped belongs in Campaigns.
 *
 * `{{firstName}}` is filled in by the backend, once per recipient, so a single
 * send can greet everyone by name. Every other `{{placeholder}}` is filled in
 * by whoever is composing, before the email goes out — the composer reads them
 * straight out of the subject and body text, so editing the copy (or writing a
 * custom email from scratch) keeps the fill-in fields in step automatically.
 */

export interface EmailPreset {
  id: string;
  label: string;
  category: EmailPresetCategory;
  /** One line shown under the preset name in the picker. */
  summary: string;
  subject: string;
  body: string;
  cta?: { label: string; url: string };
}

export type EmailPresetCategory =
  | 'Delivery'
  | 'Orders'
  | 'Payments & refunds'
  | 'Account & service';

export const EMAIL_PRESET_CATEGORIES: EmailPresetCategory[] = [
  'Delivery',
  'Orders',
  'Payments & refunds',
  'Account & service',
];

const APP_URL = 'https://awarome.com';

/**
 * Saved templates and code-defined presets share one picker and one
 * selection key, so saved ids carry a prefix to tell the two apart.
 */
export const TEMPLATE_KEY_PREFIX = 'template:';

export const templateKey = (id: string) => `${TEMPLATE_KEY_PREFIX}${id}`;

export const templateIdFromKey = (key: string) =>
  key.startsWith(TEMPLATE_KEY_PREFIX) ? key.slice(TEMPLATE_KEY_PREFIX.length) : null;

export const EMAIL_PRESETS: EmailPreset[] = [
  // ---------------------------------------------------------------- Delivery
  {
    id: 'batch-not-formed',
    label: "Batch didn't fill",
    category: 'Delivery',
    summary:
      'Not enough deliveries heading that way to form a batch — offer instant delivery.',
    subject: "About your batch delivery to {{destination}}",
    body: `Hi {{firstName}},

We weren't able to send your delivery out on batch today. Batch delivery works by grouping several packages heading the same way, and we didn't get enough deliveries going toward {{destination}} in your window to make up a batch.

We're sorry — we know that isn't the answer you were hoping for.

Here's where things stand: your delivery hasn't been dispatched, and {{resolution}}.

If the package needs to move today, Instant Delivery is your fastest route. It doesn't wait for other drop-offs — a rider is assigned to your package alone and heads straight out. It costs more than batch, but it goes now.

Thanks for bearing with us.`,
    cta: { label: 'Book instant delivery', url: APP_URL },
  },
  {
    id: 'delivery-running-late',
    label: 'Delivery running late',
    category: 'Delivery',
    summary: "It's behind schedule — we're watching it and here's the new ETA.",
    subject: 'Your delivery {{trackingId}} is running late',
    body: `Hi {{firstName}},

Your delivery {{trackingId}} is running behind schedule, and we wanted you to hear it from us rather than wonder.

The hold-up: {{reason}}.

We're monitoring this one directly and expect it to arrive {{newEta}}. Your rider's details and live progress stay available in the app the whole way.

If anything changes on our side, we'll email you again rather than leave you guessing. And if this delay has caused a problem on your end, reply to this email and we'll sort it out with you.

Sorry for the wait.`,
  },
  {
    id: 'rider-reassigned',
    label: 'Rider unavailable — reassigning',
    category: 'Delivery',
    summary: 'The assigned rider dropped off; a replacement is being dispatched.',
    subject: "We're assigning a new rider to your delivery",
    body: `Hi {{firstName}},

The rider assigned to your delivery {{trackingId}} became unavailable before pickup, so we've pulled the job back and are dispatching it to another rider nearby.

You don't need to do anything. Once a new rider accepts, their name and live location will show up in the app exactly as before.

This will add roughly {{delayEstimate}} to your original estimate. We're sorry for the shuffle — it isn't the experience we want you to have.`,
  },
  {
    id: 'failed-delivery-attempt',
    label: 'Failed delivery attempt',
    category: 'Delivery',
    summary: "Rider reached the drop-off but couldn't hand the package over.",
    subject: 'We couldn’t complete your delivery today',
    body: `Hi {{firstName}},

Our rider got to {{address}} today with your delivery, but wasn't able to hand it over — {{reason}}.

The package is safe and back with us. To get it moving again, just reply to this email or call us on the number in the app with a good time and a phone number that will be reachable, and we'll schedule another attempt.

If it's easier for someone else to receive it, let us know their name and number and we'll release it to them.`,
  },
  {
    id: 'address-clarification',
    label: 'Address needs clarifying',
    category: 'Delivery',
    summary: "The drop-off address isn't specific enough to complete delivery.",
    subject: 'Quick question about your delivery address',
    body: `Hi {{firstName}},

We're getting your delivery {{trackingId}} ready, but the drop-off address we have — {{address}} — isn't quite enough for our rider to find the door.

Could you reply with {{missingDetail}}? A landmark nearby helps too.

We've put the delivery on hold rather than send a rider out to circle the area. As soon as we hear back from you, it goes straight out.`,
  },
  {
    id: 'outside-coverage',
    label: 'Outside coverage area',
    category: 'Delivery',
    summary: "The pickup or drop-off falls outside where we currently run.",
    subject: "We don't cover {{location}} yet",
    body: `Hi {{firstName}},

Thanks for trying to book with us. Unfortunately {{location}} sits outside the area we currently cover, so we aren't able to take this delivery.

We're not leaving you out of pocket — {{resolution}}.

We're expanding coverage steadily, and {{location}} is on the list. If there's a nearby pickup or drop-off point inside our current area that would work for you, reply and we'll check it against the map for you.

Sorry we couldn't help this time.`,
  },
  {
    id: 'weather-disruption',
    label: 'Weather or road disruption',
    category: 'Delivery',
    summary: 'Conditions on the road are holding deliveries up across an area.',
    subject: 'Deliveries in {{location}} are delayed today',
    body: `Hi {{firstName}},

{{reason}} in {{location}} today, and we've slowed deliveries in that area rather than push riders through conditions we're not comfortable with.

Your delivery {{trackingId}} is affected. It's safe, and it will go out as soon as the route clears — we're expecting that {{newEta}}.

We'll keep you posted if that changes. Thanks for your patience, and sorry for the disruption.`,
  },
  {
    id: 'package-damaged',
    label: 'Package damaged in transit',
    category: 'Delivery',
    summary: 'Own the damage, explain the resolution.',
    subject: 'About the damage to your delivery',
    body: `Hi {{firstName}},

We're sorry — your package on delivery {{trackingId}} was damaged while it was with us. That's our responsibility, not something we're going to explain away.

Here's what we're doing about it: {{resolution}}.

We're also reviewing what happened on this route so it doesn't repeat. If the resolution above doesn't cover what you've lost, reply to this email and tell us — we'd rather hear it and make it right.`,
  },
  {
    id: 'delivery-rescheduled',
    label: 'Moved to the next batch window',
    category: 'Delivery',
    summary: "The delivery missed today's window and rolls to the next one.",
    subject: 'Your delivery has moved to the {{newWindow}} window',
    body: `Hi {{firstName}},

Your batch delivery {{trackingId}} didn't make today's dispatch — {{reason}} — so we've moved it to the {{newWindow}} window.

Nothing is lost and nothing is charged twice: the delivery keeps its place and goes out with that batch.

If waiting doesn't work for you, reply to this email and we'll look at switching it to instant delivery or cancelling it for a full refund — your call.`,
  },

  // ------------------------------------------------------------------ Orders
  {
    id: 'item-out-of-stock',
    label: 'Item out of stock',
    category: 'Orders',
    summary: "The vendor can't supply an item that was ordered.",
    subject: 'An item on your order {{orderId}} is out of stock',
    body: `Hi {{firstName}},

We've hit a snag with your order {{orderId}}. {{itemName}} is out of stock at the vendor, and their listing hadn't caught up with their shelves.

You have two ways to go from here:

1. We refund you for that item and send the rest of your order as normal.
2. We swap it for something comparable — tell us what you'd like and we'll check availability first.

Reply and tell us which you'd prefer. If we don't hear back by {{decisionDeadline}}, we'll go with the refund so your order isn't sitting still.

Sorry for the inconvenience.`,
  },
  {
    id: 'vendor-could-not-accept',
    label: "Vendor couldn't accept the order",
    category: 'Orders',
    summary: 'The vendor never confirmed, so the order was cancelled.',
    subject: 'Your order {{orderId}} has been cancelled',
    body: `Hi {{firstName}},

Your order {{orderId}} has been cancelled. The vendor wasn't able to confirm it — {{reason}} — and we won't leave an order hanging with no one working on it.

You haven't lost your money: {{resolution}}.

If you'd like, reply and we'll point you to other vendors carrying the same items, or place the order with one of them on your behalf.

We're sorry this one didn't work out.`,
  },
  {
    id: 'partial-fulfilment',
    label: 'Partial fulfilment',
    category: 'Orders',
    summary: 'Part of the order ships; the rest is refunded.',
    subject: 'Part of your order {{orderId}} is on its way',
    body: `Hi {{firstName}},

Your order {{orderId}} is going out, but not complete. The vendor could supply most of it — {{unavailableItems}} weren't available.

So here's what's happening: everything else is packed and on its way to you, and we're refunding {{refundAmount}} for what's missing. That refund is already in motion; you don't need to request it.

If you'd rather we source the missing items from another vendor, reply and we'll get on it.

Sorry for the gap.`,
  },

  // ------------------------------------------------------- Payments & refunds
  {
    id: 'payment-not-confirmed',
    label: "Payment didn't go through",
    category: 'Payments & refunds',
    summary: 'The charge never confirmed, so the order is on hold.',
    subject: "We couldn't confirm payment for {{orderId}}",
    body: `Hi {{firstName}},

Payment for your order {{orderId}} didn't come through, so we've put the order on hold rather than cancel it outright.

If your bank shows the money as taken, don't pay again — reply to this email with the date and amount and we'll trace it. Held funds from a failed attempt are normally released by your bank within {{reversalWindow}}.

If nothing left your account, you can complete payment in the app and your order carries on from where it stopped.

We'll hold your items until {{holdDeadline}}.`,
  },
  {
    id: 'refund-initiated',
    label: 'Refund on the way',
    category: 'Payments & refunds',
    summary: 'Confirms a refund has been sent and when it should land.',
    subject: 'Your refund of {{refundAmount}} is on the way',
    body: `Hi {{firstName}},

We've processed a refund of {{refundAmount}} for {{reference}}.

It's left us and is now with your bank. Refunds typically land within {{refundWindow}}, though the exact timing is on their side rather than ours.

You don't need to do anything or chase anyone. If it hasn't shown up after {{refundWindow}}, reply to this email and we'll follow it up with the payment provider directly.

Sorry again for the trouble that led to this.`,
  },
  {
    id: 'refund-completed',
    label: 'Refund completed',
    category: 'Payments & refunds',
    summary: 'The money has landed — closing the loop.',
    subject: 'Your refund of {{refundAmount}} has been completed',
    body: `Hi {{firstName}},

Confirming that your refund of {{refundAmount}} for {{reference}} has been completed on our side and settled.

If you don't see it in your account, check the statement for the original payment date — some banks post refunds against that date rather than today's.

Thanks for your patience while we sorted this out. If anything still doesn't look right, reply and we'll take another look.`,
  },
  {
    id: 'duplicate-charge',
    label: 'Charged twice',
    category: 'Payments & refunds',
    summary: 'A duplicate charge was found and is being reversed.',
    subject: "We've reversed a duplicate charge",
    body: `Hi {{firstName}},

You were charged twice for {{reference}}. That was our error, and we've reversed the extra {{refundAmount}}.

You didn't need to notice this for us to fix it, and you don't need to do anything now. The reversal should reach your account within {{refundWindow}}.

We're sorry — being charged twice is exactly the kind of thing that makes you think twice about an app, and we don't take it lightly.`,
  },
  {
    id: 'goodwill-credit',
    label: 'Goodwill credit',
    category: 'Payments & refunds',
    summary: 'Apology plus wallet credit for a poor experience.',
    subject: "Sorry about that — we've added {{creditAmount}} to your wallet",
    body: `Hi {{firstName}},

We got this one wrong: {{reason}}.

An apology on its own is cheap, so we've added {{creditAmount}} to your Awarome wallet. It's there now and applies automatically to your next order or delivery — nothing to claim, no code to enter.

It doesn't undo the inconvenience, but we'd rather do something than say nothing. Thanks for staying with us.`,
    cta: { label: 'Open Awarome', url: APP_URL },
  },

  // ------------------------------------------------------- Account & service
  {
    id: 'service-disruption',
    label: 'Service disruption',
    category: 'Account & service',
    summary: 'Something was down and it affected this customer.',
    subject: 'About the disruption you ran into',
    body: `Hi {{firstName}},

Between {{disruptionWindow}}, {{reason}}. If you were trying to {{affectedAction}} during that time, that's why it wouldn't work.

Everything is back up and running normally now. Anything that failed during the window wasn't charged, and any order stuck mid-flow has been released.

If something on your account still looks wrong, reply to this email and we'll go through it with you.

Sorry for the interruption.`,
  },
  {
    id: 'account-under-review',
    label: 'Account under review',
    category: 'Account & service',
    summary: 'Access is limited while the team reviews activity.',
    subject: 'Your Awarome account is under review',
    body: `Hi {{firstName}},

We've temporarily limited some activity on your Awarome account while our team reviews it. The reason: {{reason}}.

This isn't a permanent decision, and it isn't an accusation. Reviews like this usually close within {{reviewWindow}}.

To help us finish faster, reply to this email with {{requestedInfo}}.

We'll email you the moment the review is complete.`,
  },
  {
    id: 'support-follow-up',
    label: "We're looking into it",
    category: 'Account & service',
    summary: 'Acknowledge a complaint and set expectations on the follow-up.',
    subject: "We're looking into {{issueSummary}}",
    body: `Hi {{firstName}},

Thanks for flagging this — we've got it, and it's with {{owner}} now.

To be straight with you about timing: we expect to have an answer for you by {{responseDeadline}}. If we need longer than that, we'll tell you before the deadline rather than let it go quiet.

You don't need to chase us. If anything new comes up on your side in the meantime, just reply to this email and it lands on the same thread.`,
  },
];

export const getEmailPreset = (id: string) =>
  EMAIL_PRESETS.find((preset) => preset.id === id);

/**
 * Turns a placeholder key into a human label for the fill-in panel —
 * 'newEta' becomes 'New eta', 'trackingId' becomes 'Tracking id'.
 */
export function placeholderLabel(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Resolved per recipient by the backend, so it is never a fill-in field. */
export const AUTO_PLACEHOLDERS = ['firstName'];

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Reads the fill-in fields out of the text itself rather than off the preset,
 * so a hand-edited preset — or a custom email written from scratch — gets the
 * same fill-in panel, in the order the placeholders are read.
 */
export function extractPlaceholders(...texts: string[]): string[] {
  const found: string[] = [];
  for (const text of texts) {
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
      const key = match[1];
      if (!AUTO_PLACEHOLDERS.includes(key) && !found.includes(key)) {
        found.push(key);
      }
    }
  }
  return found;
}

/** Substitutes filled-in values, leaving anything still blank as-is. */
export function applyPlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(PLACEHOLDER_PATTERN, (whole, key: string) => {
    const value = values[key]?.trim();
    return value ? value : whole;
  });
}
