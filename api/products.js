import { getSupabase, methodNotAllowed } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  try {
    const { data, error } = await getSupabase()
      .from('products')
      .select('id, slug, name, category, description, price, stock')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return res.status(200).json(data);
  } catch (error) {
    console.error('products endpoint:', error.message);
    return res.status(500).json({ error: 'Não foi possível carregar os produtos.' });
  }
}
