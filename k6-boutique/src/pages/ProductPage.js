import { BASE_URL } from '../lib/client.js';

export class ProductPage {
  constructor(page) {
    this.page = page;
  }

  async goto(productId) {
    await this.page.goto(`${BASE_URL}/product/${productId}`, { waitUntil: 'networkidle' });
  }

  isErrorPage() {
    return this.page.url().includes('error');
  }
}
