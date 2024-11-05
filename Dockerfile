# Use an official Node.js runtime as a parent image
FROM node:14 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build your application (if applicable)
# RUN npm run build  # Uncomment this if you have a build step

# Use a lightweight web server to serve the files
FROM nginx:alpine

# Copy the built files from the previous stage
COPY --from=build /app /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]