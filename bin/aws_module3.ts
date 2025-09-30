import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/product_service_stack';

const app = new cdk.App();
new ProductServiceStack(app, 'ProductServiceStack', {
});
