FROM gitpod/workspace-full:latest

# Install specific Node.js version (20.x LTS)
RUN bash -c ". .nvm/nvm.sh && nvm install 20 && nvm use 20 && nvm alias default 20"

# Set Node.js 20 as default for all shells
RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix
