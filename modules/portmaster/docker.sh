#!/bin/bash

docker run                  \
    -ti                     \
    --rm                    \
    -w /usr/src/app         \
    -v $(pwd):/usr/src/app  \
    -p 8080:4200            \
    node:latest             \
    npm start -- --host 0.0.0.0