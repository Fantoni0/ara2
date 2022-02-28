# Comprobar parámetros
if [ $# -lt 0 ];then
  echo "Use: $(basename "$0") [key_size] [n_keys]"
  echo "It generates the required RSA keys for ARA2 access mode"
  echo "Example: generateKeys.sh ./demo"
  exit
fi

# Key size
if [ $# -lt 0 ];then
  keySize=$1
else
  keySize=128
fi

# Number of keys to generate
if [ $# -lt 1 ];then
  numberKeys=$2
else
  numberKeys=10
fi

echo $keySize
# Target directory
targetDirectory=/keys/"$keySize"/
echo $targetDirectory

# Create target folder if it does not exist.
if [ ! -d ${targetDirectory} ]; then
    mkdir -p ${targetDirectory}
fi

# Change directory
cd targetDirectory || exit
for i in $(seq 1 ${numberKeys});
do
  echo $keySize
  openssl genrsa -out private-key-${i}.pem ${keySize}  # Generate private key
  openssl rsa -in private-key-${i}.pem -pubout -out public-key-${i}.pem # Generate associated public key
done