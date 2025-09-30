import { ProductService } from "../shared/product_service";

export async function main() {
  return await new ProductService().getProductList();
}
