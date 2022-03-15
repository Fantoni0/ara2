# How to Grant Anonymous Access
Javascript implementation of an anonymous distributed access protocol.
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

The PoC implements three modes of operation:

- TRA2: Trusted Registration, Anonymous Access. Where a single centralized Dealer is in charge of the identification and registration.
- TDRA2: Trusted Distributed Registration, Anonymous Access. A set of decentralized parties substitute the role of the centralized Dealer.
- ARA2: Anonymous Registration, Anonymous Access. By using homomorphic cryptography, the access-key of the user cannot be traced by either Dealers or Guards.

:warning: This is a repository for research purposes. The code has not been audited.
Cryptography is a pretty sensible issue and only reputed and tested sources should be used in a production environment.
Use at your own risk!

:information_source: The presented results were obtained using a Ryzen 7 3700X (16 cores) processor on Linux :penguin:.
Times might change in different environments.

## Installation
Assuming that you have node installed:
```
git clone https://github.com/Fantoni0/ara2
cd ara2
npm install
```

## Usage
An example of how to use the library:

This snippet will launch a simulation that performs 10 requests, with 1 dealer, 7 guards under the mode TRA2.
```
./src/Simulation.js -d 1 -g 7 -b 512 -r 10 -m TRA2
```

This second snippet will launch a simulation that performs 10 requests, with 3 dealer, 5 guards under the mode ARA2.
It will save the results in CSV format. 
```
./src/Simulation.js -d 3 -g 5 -b 1024 -r 10 -m ARA2 -s
```

## Future Improvements
- Add check to ensure the setup finalized properly.
- Change patterns so that every conversation has a unique socket.
- Encrypt communications.

## Citation
This repository is part of a research article carried out by [ALFA](https://alfa.webs.upv.es/) research group.
Spanish Patent Application (P202130890).
Article yet to be published. The link will be here provided.
