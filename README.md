# ARA2: Anonymous Registration, Anonymous Access
Python implementation of an anonymous distributed access protocol.
The code is framed within research of different protocols for anonymous registration and access.
See Citation section at the bottom of the page.

The access to a service can be roughly summarized as three phases:
- Identification as the process by which a verifier certifies that the credentials suffice to guarantee the identity of a claimant, and,
therefore, entitles the access to the resource.
- Registration as an intermediate step where the claimant is provided with the access-keys (credentials).
- Access as the final service through the provided access-keys.

In this work, we focus on anonymous and distributed registration and access.
We provide a proof of concept implementation that shows how the secure access can be granted and the associated costs of the implementation.
The system consists on a set of parties collaborating to grant and obtain access:

- Users: As the parties interested on getting access.
- Dealers: The parties that know partial secrets and are in charge of creating access-keys.
- Guards: The parties in charge of validating access-keys and granting access.
- Proxy: The entity that serves as interface to users to abstract the service.

:warning: This is a repository for research purposes. The code has not been audited.
Cryptography is a pretty sensible issue and only reputed and tested sources should be used in a production environment.
Use at your own risk!

:information_source: The presented results were obtained using a Ryzen 7 3700X (16 cores) processor on Linux :penguin:.
Times might change in different environments.

## Installation
Assuming that you have pip installed:
```
git clone https://github.com/Fantoni0/ara2
cd ara2/src
pip install -r requirements.txt
```

### Requirements
The library has minimal requirements. All of them are included in requirements.txt.
Following the installation process solves the dependencies.
- `pyzmq` for messaging layer.
- `python-dotenv` for config files.
- `matplotlib` for plotting the results.

## Usage
An example of how to use the library:
```
CODE HERE
```

## Installation
Future improvements:
    - Add check to ensure the setup finalized properly.
    - Change patterns so that every conversation has a unique socket.
    - Encrypt communications.

## Citation
This repository is part of a research article carried out by [ALFA](https://alfa.webs.upv.es/) research group.
Spanish Patent Application (P202130890).
Article yet to be published. The link will be here provided.