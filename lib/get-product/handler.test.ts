import { main as getProduct } from "./handler";
import { expect, it, describe } from '@jest/globals';
import { MOCK_PRODUCTS } from '../shared/mock_data';

describe('getProduct', () => {

  it('should get product by id', async () => {
    const product = await getProduct(MOCK_PRODUCTS[0]);
    expect(product).toEqual(MOCK_PRODUCTS[0]);
  });

  it('should throw error if not found any product', async () => {
    const product = getProduct({id: 'non-existing-id'});
    expect(product).rejects.toThrow("NotFound");
  });
});
