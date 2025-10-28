import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/product_service_stack';
import { ImportServiceStack } from '../lib/import_service_stack';
import { AuthorizationServiceStack } from '../lib/authorization-service_stack';

const app = new cdk.App();
new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {
});
new ProductServiceStack(app, 'ProductServiceStack', {
});
new ImportServiceStack(app, 'ImportServiceStack', {
});
