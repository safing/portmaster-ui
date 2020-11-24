#!/bin/bash

docker run                  \
    -ti                     \
    --rm                    \
    -w /project             \
    -v $(pwd):/project      \
    -p 8080:4200            \
    node:latest             \
    npm start -- --host 0.0.0.0
