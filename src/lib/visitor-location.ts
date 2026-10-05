import { z } from 'zod';

import { normalizeTimeZone } from '@/lib/time-zone';

export const VisitorLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  city: z.string().max(100).optional(),
  timeZone: z.preprocess(normalizeTimeZone, z.string().optional()),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});

export const VisitorLocationResponseSchema = z.object({
  location: VisitorLocationSchema.nullable(),
});

export type VisitorLocation = z.infer<typeof VisitorLocationSchema>;

function coordinate(value: string | null) {
  if (!value || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) {
    return undefined;
  }
  return Number(value);
}

function cityName(value: string | null) {
  if (!value) {
    return undefined;
  }
  try {
    return decodeURIComponent(value).trim().slice(0, 100) || undefined;
  } catch {
    return undefined;
  }
}

/** Only platform geolocation is used; raw IP addresses never enter the response. */
export function visitorLocationFromHeaders(headers: Headers) {
  const country = headers.get('x-vercel-ip-country');
  const result = VisitorLocationSchema.safeParse({
    latitude: coordinate(headers.get('x-vercel-ip-latitude')),
    longitude: coordinate(headers.get('x-vercel-ip-longitude')),
    city: cityName(headers.get('x-vercel-ip-city')),
    timeZone: headers.get('x-vercel-ip-timezone'),
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
  });
  return result.success ? result.data : null;
}
