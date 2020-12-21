#!/bin/bash

set -e

echo "Cloning gosquared/flags into /tmp"
rm -rf /tmp/flags.git
git clone https://github.com/gosquared/flags.git /tmp/flags.git

rm -rf ./assets/img/flags || true
mv /tmp/flags.git/flags/flags-iso/flat/16 ./assets/img/flags
cp /tmp/flags.git/LICENSE.txt ./assets/img/flags/LICENSE.txt
