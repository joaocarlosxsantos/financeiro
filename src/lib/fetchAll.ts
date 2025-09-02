export async function fetchAll<T = any>(endpoint: string, fetchOpts?: RequestInit): Promise<T[]> {
  const collected: T[] = [];
  const perPageMatch = endpoint.match(/[?&]perPage=(\d+)/);
  const defaultPerPage = perPageMatch ? Number(perPageMatch[1]) : 50;
  let page = 1;
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${sep}page=${page}`;
    try {
      const res = await fetch(url, fetchOpts);
      if (!res.ok) break;
      const data = await res.json();
      if (Array.isArray(data)) collected.push(...data);
      const totalHeader = res.headers.get('X-Total-Count');
      const perHeader = res.headers.get('X-Per-Page');
      const total = totalHeader ? Number(totalHeader) : null;
      const per = perHeader ? Number(perHeader) : defaultPerPage;
      if (total !== null) {
        const pages = per > 0 ? Math.ceil(total / per) : 1;
        if (page >= pages) break;
      } else {
        if (!Array.isArray(data) || data.length < per) break;
      }
      page += 1;
    } catch (e) {
      break;
    }
  }
  return collected;
}

export default fetchAll;