import { ProductService } from "../shared/product_service";

export async function main({id = ''}) {
  const selectedProduct = await new ProductService().getProductById(id);
  if(!selectedProduct) {
    throw new Error("NotFound");
  }

  return selectedProduct;
}
