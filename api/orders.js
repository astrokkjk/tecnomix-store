import { getSupabase, methodNotAllowed } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const { customer_name, customer_email, items } = req.body ?? {};
  const name = typeof customer_name === 'string' ? customer_name.trim() : '';
  const email = typeof customer_email === 'string' ? customer_email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Informe um nome com até 100 caracteres.' });
  }
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
    return res.status(400).json({ error: 'Adicione entre 1 e 30 produtos.' });
  }
  const normalizedItems = items.map((item) => ({
    product_id: item?.product_id,
    quantity: Number(item?.quantity)
  }));
  if (normalizedItems.some((item) => typeof item.product_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return res.status(400).json({ error: 'Um dos produtos ou quantidades é inválido.' });
  }

  try {
    const { data, error } = await getSupabase().rpc('create_store_order', {
      p_customer_name: name,
      p_customer_email: email,
      p_items: normalizedItems
    });
    if (error) {
      if (error.message.includes('insufficient_stock') || error.message.includes('product_unavailable')) {
        return res.status(409).json({ error: 'Um dos produtos está indisponível ou sem estoque.' });
      }
      throw error;
    }
    const row = data[0];
    return res.status(201).json({
      order_number: `TM-${row.order_id.slice(0, 8).toUpperCase()}`,
      total: row.total
    });
  } catch (error) {
    console.error('orders endpoint:', error.message);
    return res.status(500).json({ error: 'Não foi possível registrar o pedido. Tente novamente.' });
  }
}
