import type { ContentItem, ContentStatus } from '../types';

export function filterContents(
  contents: ContentItem[],
  options: { query?: string; status?: ContentStatus | ''; brandId?: string; brandNames?: Record<string, string>; profileNames?: Record<string, string> },
): ContentItem[] {
  const search = options.query?.trim().toLocaleLowerCase() ?? '';
  return contents.filter((item) => {
    const text = `${item.title} ${item.platform} ${item.format} ${item.pillar} ${item.script} ${item.notes} ${options.brandNames?.[item.brand_id ?? ''] ?? ''} ${options.profileNames?.[item.social_profile_id ?? ''] ?? ''}`.toLocaleLowerCase();
    return (!search || text.includes(search)) &&
      (!options.status || item.status === options.status) &&
      (!options.brandId || item.brand_id === options.brandId);
  });
}

export function groupContentsByStatus(contents: ContentItem[]): Record<ContentStatus, ContentItem[]> {
  return {
    idea: contents.filter((item) => item.status === 'idea'),
    draft: contents.filter((item) => item.status === 'draft'),
    ready: contents.filter((item) => item.status === 'ready'),
    published: contents.filter((item) => item.status === 'published'),
  };
}

export function groupContentsByDate(contents: ContentItem[]): Record<string, ContentItem[]> {
  return contents.reduce<Record<string, ContentItem[]>>((grouped, item) => {
    if (!item.scheduled_at) return grouped;
    const date = new Date(item.scheduled_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    (grouped[key] ??= []).push(item);
    return grouped;
  }, {});
}
