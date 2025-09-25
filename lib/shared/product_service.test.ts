import { ProductService } from "./product_service";
import { expect, it, describe } from '@jest/globals';
import { MOCK_PRODUCTS } from './mock_data';

describe('product service', () => {
  const productService = new ProductService();

  it('should get product list', async () => {
    const products = await productService.getProductList();
    expect(products).toEqual(MOCK_PRODUCTS);
  });

  it('should get product by id', async () => {
    const products = await productService.getProductById(MOCK_PRODUCTS[0].id);
    expect(products).toEqual(MOCK_PRODUCTS[0]);
  });
});
