const API_URL = 'https://TEN-DICH-VU-CUA-BAN.onrender.com/api';
// Tạm dùng ID khách hàng mẫu có sẵn trong DB (sau sẽ lấy từ localStorage khi đăng nhập)
const CURRENT_USER_ID = '6af70159d9c7686deb9f34bb';

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + ' ₫';

// 1. Tải danh sách sản phẩm lên trang chủ
async function loadProducts() {
  const container = document.getElementById('product-list');
  try {
    const res = await fetch(`${API_BASE}/products`);
    const result = await res.json();
    const products = result.data || result;

    if (!products.length) {
      container.innerHTML = '<p>Chưa có sản phẩm nào trong cơ sở dữ liệu.</p>';
      return;
    }

    container.innerHTML = products.map(p => {
      const firstVariant = p.variants?.[0] || {};
      const rawPrice = firstVariant.salePrice?.$numberDecimal || firstVariant.salePrice
        || firstVariant.price?.$numberDecimal || firstVariant.price || 0;
      const imgUrl = p.images?.[0] || 'https://placehold.co/400x300?text=Badminton';

      return `
        <div class="card">
          <div>
            <img src="${imgUrl}" alt="${p.name}" onerror="this.onerror=null; this.src='https://placehold.co/400x300/e2e8f0/1e293b?text=Badminton+Pro';" />
            <h3>${p.name}</h3>
            <p class="meta">Mã SKU: ${firstVariant.sku || 'N/A'} | Tồn kho: ${firstVariant.stock ?? 0}</p>
            <p class="price">${formatVND(rawPrice)}</p>
          </div>
          <button class="add-btn" onclick="addToCart('${p._id}', '${firstVariant.sku}')">
            + Thêm vào giỏ
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:red">Không kết nối được Backend (kiểm tra cổng 5000).</p>';
  }
}

// 2. Thêm sản phẩm vào giỏ hàng
async function addToCart(productId, sku) {
  const res = await fetch(`${API_BASE}/carts/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: CURRENT_USER_ID, productId, sku, quantity: 1 })
  });
  const data = await res.json();
  if (data.success) {
    await loadCart();
    document.getElementById('cart-drawer').classList.remove('hidden');
  } else {
    alert(data.message || 'Lỗi thêm vào giỏ');
  }
}

// 3. Hiển thị giỏ hàng và tính tổng tiền
async function loadCart() {
  const res = await fetch(`${API_BASE}/carts/${CURRENT_USER_ID}`);
  const result = await res.json();
  const items = result.data?.items || [];

  document.getElementById('cart-count').textContent = items.reduce((sum, i) => sum + i.quantity, 0);

  let total = 0;
  document.getElementById('cart-items').innerHTML = items.length
    ? items.map(item => {
        const product = item.productId || {};
        const variant = product.variants?.find(v => v.sku === item.sku) || {};
        const price = Number(variant.salePrice?.$numberDecimal || variant.salePrice
          || variant.price?.$numberDecimal || variant.price || 0);
        total += price * item.quantity;

        return `
          <div class="cart-item">
            <div>
              <strong>${product.name || 'Sản phẩm'}</strong><br/>
              <small>${item.sku} — ${formatVND(price)}</small>
            </div>
            <div class="qty-controls">
              <button onclick="updateQty('${item._id}', ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="updateQty('${item._id}', ${item.quantity + 1})">+</button>
            </div>
          </div>
        `;
      }).join('')
    : '<p>Giỏ hàng đang trống.</p>';

  document.getElementById('cart-total').textContent = formatVND(total);
}

// 4. Tăng / giảm số lượng món trong giỏ
async function updateQty(itemId, newQty) {
  await fetch(`${API_BASE}/carts/${CURRENT_USER_ID}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: newQty })
  });
  loadCart();
}

// 5. Thanh toán đơn hàng từ giỏ
async function checkoutOrder() {
  const res = await fetch(`${API_BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: CURRENT_USER_ID,
      shippingAddress: {
        receiverName: 'Nguyễn Văn An',
        phone: '0901234567',
        province: 'Cần Thơ',
        district: 'Ninh Kiều',
        ward: 'Xuân Khánh',
        street: '123 Đường 3/2'
      },
      paymentMethod: 'cod',
      shippingFee: 30000
    })
  });
  const data = await res.json();
  alert(data.message);
  if (data.success) {
    loadCart();
    loadProducts(); // Tải lại để thấy tồn kho tự động giảm!
    toggleCart();
  }
}

function toggleCart() {
  document.getElementById('cart-drawer').classList.toggle('hidden');
}

// Khởi chạy khi mở trang
loadProducts();
loadCart();