import { main as getProductList } from "./handler";
import { expect, it, describe } from '@jest/globals';
import { MOCK_PRODUCTS } from '../shared/mock_data';

describe('getProductList', () => {

  it('should get product list', async () => {
    const products = await getProductList();
    expect(products).toEqual(MOCK_PRODUCTS);
  });
});
