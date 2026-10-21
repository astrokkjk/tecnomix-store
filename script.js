const cartCount = document.querySelector('#cart-count');
const dialog = document.querySelector('#order-dialog');
const summary = document.querySelector('#order-summary');
const message = document.querySelector('#form-message');
const cart = new Map();
let products = [];

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function refreshCart() {
  const quantity = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = quantity;
  if (!quantity) {
    summary.textContent = 'Sua sacola está vazia.';
    return;
  }
  const total = [...cart.values()].reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  summary.replaceChildren();
  [...cart.values()].forEach(({ product, quantity: count }) => {
    const line = document.createElement('div');
    line.className = 'summary-line';
    const label = document.createElement('span');
    label.textContent = `${count}× ${product.name}`;
    const price = document.createElement('strong');
    price.textContent = money(product.price * count);
    line.append(label, price);
    summary.append(line);
  });
  const totalLine = document.createElement('div');
  totalLine.className = 'summary-line summary-total';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Total';
  const totalPrice = document.createElement('strong');
  totalPrice.textContent = money(total);
  totalLine.append(totalLabel, totalPrice);
  summary.append(totalLine);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Não foi possível carregar os produtos.');
    products = await response.json();
    products.forEach((product) => {
      const card = document.querySelector(`[data-product="${product.slug}"]`);
      if (!card) return;
      card.querySelector('.category').textContent = product.category.toUpperCase();
      card.querySelector('h3').textContent = product.name;
      card.querySelector('.price').textContent = money(product.price);
      card.querySelector('.product-desc').textContent = product.description;
      const button = card.querySelector('.quick-add');
      button.dataset.productId = product.id;
      button.dataset.name = product.name;
      button.disabled = product.stock < 1;
      if (product.stock < 1) button.setAttribute('aria-label', `${product.name}: esgotado`);
    });
  } catch (error) {
    document.querySelector('#produtos .section-heading').insertAdjacentHTML(
      'afterend', '<p class="database-note">Produtos de demonstração. Configure o banco de dados para carregar o catálogo atualizado.</p>'
    );
    console.error(error);
  }
}

document.querySelectorAll('.quick-add').forEach((button) => {
  button.addEventListener('click', () => {
    const product = products.find((item) => item.id === button.dataset.productId);
    if (!product) {
      message.textContent = 'Conecte o banco de dados para adicionar produtos.';
      dialog.showModal();
      return;
    }
    const current = cart.get(product.id) ?? { product, quantity: 0 };
    if (current.quantity < product.stock) current.quantity += 1;
    cart.set(product.id, current);
    refreshCart();
    button.textContent = '✓';
    window.setTimeout(() => { button.textContent = '+'; }, 800);
  });
});

document.querySelector('#open-cart').addEventListener('click', () => {
  message.textContent = '';
  refreshCart();
  dialog.showModal();
});
document.querySelector('#close-cart').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector('#order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!cart.size) {
    message.textContent = 'Adicione pelo menos um produto antes de enviar.';
    return;
  }
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  message.textContent = 'Enviando seu pedido…';
  const form = new FormData(event.currentTarget);
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.get('customer_name'),
        customer_email: form.get('customer_email'),
        items: [...cart.values()].map(({ product, quantity }) => ({ product_id: product.id, quantity }))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível registrar seu pedido.');
    cart.clear();
    refreshCart();
    event.currentTarget.reset();
    message.textContent = `Pedido ${result.order_number} registrado! A loja entrará em contato por e-mail.`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

loadProducts();
