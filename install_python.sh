#!/usr/bin/env bash

# Install Python 3.11.10 manually
PYTHON_VERSION=3.11.10

# Download and extract
wget https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tgz
tar -xvzf Python-$PYTHON_VERSION.tgz
cd Python-$PYTHON_VERSION

# Configure & build
./configure --enable-optimizations --prefix=$HOME/.local
make -j$(nproc)
make install

# Add new Python to PATH
export PATH=$HOME/.local/bin:$PATH

# Verify
python3 --version
pip3 --version
