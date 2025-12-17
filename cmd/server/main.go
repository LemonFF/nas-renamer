package main

import (
	"log"
	"nas-renamer/internal/api"
	"nas-renamer/internal/middleware"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Configuration
	rootDir := os.Getenv("NAS_ROOT")
	if rootDir == "" {
		rootDir = "."
		log.Println("NAS_ROOT not set, defaulting to current directory")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Static assets location
	staticDir := "static"
	if envStatic := os.Getenv("STATIC_DIR"); envStatic != "" {
		staticDir = envStatic
	}

	handler, err := api.NewHandler(rootDir)
	if err != nil {
		log.Fatalf("Failed to initialize handler: %v", err)
	}

	r := gin.Default()

	// Static files
	// Use relative paths if staticDir is relative, or absolute if absolute.
	// r.Static expects local filesystem path.
	r.Static("/css", staticDir+"/css")
	r.Static("/js", staticDir+"/js")
	r.StaticFile("/index.html", staticDir+"/index.html")
	r.StaticFile("/login.html", staticDir+"/login.html")
	r.StaticFile("/", staticDir+"/index.html")

	// API Group
	apiGroup := r.Group("/api")
	{
		apiGroup.POST("/login", handler.HandleLogin)

		// Authenticated Routes
		authorized := apiGroup.Group("/")
		authorized.Use(middleware.AuthMiddleware())
		{
			authorized.GET("/files", handler.HandleListFiles)
			authorized.POST("/rename/preview", handler.HandlePreview)
			authorized.POST("/rename/execute", handler.HandleExecute)
			authorized.GET("/history", handler.HandleGetHistory)
			authorized.POST("/history/undo", handler.HandleUndo)

			// Optimizations
			authorized.GET("/config/ignored-extensions", handler.HandleGetConfig)
			authorized.POST("/config/ignored-extensions", handler.HandleSetConfig)
			authorized.GET("/scan/frequent-strings", handler.HandleScanFrequent)
		}
	}

	log.Printf("Server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
