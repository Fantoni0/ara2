


openssl genrsa -out private-key.pem 256  # Generate private key
openssl rsa -in private-key.pem -pubout -out public-key.pem # Generate associated public key
