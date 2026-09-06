package com.streamflix;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StreamflixApplication {

    private static final Logger logger = LoggerFactory.getLogger(StreamflixApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(StreamflixApplication.class, args);
        logger.info("=================================================");
        logger.info("  STREAMFLIX SERVER STARTED SUCCESSFULLY");
        logger.info("  Web UI:     http://localhost:8080/");
        logger.info("  REST API:   http://localhost:8080/api/health");
        logger.info("=================================================");
    }
}
