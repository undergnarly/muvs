module.exports = {
    apps: [{
        name: "muvs-api",
        script: "./index.js",
        env: {
            NODE_ENV: "production",
            DATA_DIR: "/var/www/muvs-data"
        }
    }]
}
