# Comprobar parámetros
if [ $# -lt 0 ];then
  echo "Use: $(basename "$0") [key_size] [n_keys]"
  echo "It generates the required RSA keys for ARA2 access mode"
  echo "Example: generateKeys.sh ./demo"
  exit
fi

# Key size
if [ $# -lt 1 ];then
  keySize=512
else
  keySize=$1
fi

# Number of keys to generate
if [ $# -lt 2 ];then
  numberKeys=10
else
  numberKeys=$2
fi

echo $keySize
echo $numberKeys
# Target directory
targetDirectory=./keys/"$keySize"/

# Create target folder if it does not exist.
if [ ! -d ${targetDirectory} ]; then
  echo ${targetDirectory}
  mkdir -p ${targetDirectory}
fi

# Change directory
cd ${targetDirectory} || exit
for (( i=1; i<=numberKeys; i++ ))
do
   openssl genrsa -out private-key-${i}.pem ${keySize}  # Generate private key
   openssl rsa -in private-key-${i}.pem -pubout -out public-key-${i}.pem # Generate associated public key
done
