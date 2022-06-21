const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "product-crud";
const healthPath = "/health";
const productPath = "/product";
const productsPath = "/products";

exports.handler = async (event) => {
  console.log(event);
  let response;

  switch (true) {
    case event.httpMethod === "GET" && event.path === healthPath:
      response = buildResponse(200);
      break;
    case event.httpMethod === "GET" && event.path === productPath:
      response = await getProduct(event.queryStringParameters.productd);
      break;
    case event.httpMethod === "GET" && event.path === productsPath:
      response = await getProducts();
      break;
    case event.httpMethod === "POST" && event.path === productPath:
      response = await saveProduct(JSON.parse(event.body));
      break;
    case event.httpMethod === "PATCH" && event.path === productPath:
      const requestBody = JSON.parse(event.body);
      response = await updateProduct(
        requestBody.productd,
        requestBody.updateKey,
        requestBody.updateValue
      );
      break;
    case event.httpMethod === "DELETE" && event.path === productPath:
      response = await deleteProduct(JSON.parse(event.body).productd);
      break;

    default:
      response = buildResponse(404, "Not Found");
  }
  return response;
};

async function getProduct(productd) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      productd: productd,
    },
  };
  return await dynamodb
    .get(params)
    .promise()
    .then(
      (res) => {
        return buildResponse(200, res.Item);
      },
      (err) => {
        return buildResponse(500, err);
      }
    );
}

async function getProducts() {
  const params = {
    TableName: dynamodbTableName,
  };

  const allProducts = await scanDynamoRecords(params, []);
  const body = {
    products: allProducts,
  };
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error(error);
  }
}

async function saveProduct(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody,
  };

  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
          Message: "Product saved successfully",
          Item: requestBody,
        };
        return buildResponse(200, body);
      },
      (err) => {
        return buildResponse(500, err);
      }
    );
}

async function updateProduct(productd, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      productd: productd,
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };

  return await dynamodb
    .update(params)
    .promise()
    .then(
      (res) => {
        const body = {
          Operation: "UPDATE",
          Message: "Product updated successfully",
          Item: res,
        };
        return buildResponse(200, body);
      },
      (err) => {
        return buildResponse(500, err);
      }
    );
}

async function deleteProduct(productd) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      productd: productd,
    },
  };
  return await dynamodb
    .delete(params)
    .promise()
    .then(
      (res) => {
        const body = {
          Operation: "DELETE",
          Message: "Product deleted successfully",
          Item: res,
        };
        return buildResponse(200, body);
      },
      (err) => {
        return buildResponse(500, err);
      }
    );
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },  
  };
}
