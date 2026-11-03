import { redirect } from 'next/navigation';

/** Settings opens on its first section (packages/facet/patterns/settings.md: one route per section). */
export default function Settings() {
  redirect('/settings/rating-lab');
}
