import {Product} from './product.d';
import { MOCK_PRODUCTS } from './mock_data';

export class ProductService {

  private products: Product[] = MOCK_PRODUCTS;

  async getProductList(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.find(p => p.id === id);
  }
}
