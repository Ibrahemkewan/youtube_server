#include <iostream>
#include <cstring>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <thread>
#include <vector>
#include <map>
#include <algorithm>
#include <random>
#include <sstream>
#include <chrono>
#include <iomanip>

#pragma comment(lib, "Ws2_32.lib")

std::map<std::string, std::vector<std::string>> user_video_history;
std::map<std::string, int> video_views;

std::string get_current_time() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %X");
    return ss.str();
}

void log_message(const std::string& message) {
    std::cout << "[" << get_current_time() << "] " << message << std::endl;
}

std::vector<std::string> get_recommendations(const std::string& user_id) {
    log_message("Fetching recommendations for user: " + user_id);
    std::map<std::string, int> video_scores;
    std::vector<std::string> watched_videos = user_video_history[user_id];

    log_message("User " + user_id + " has watched " + std::to_string(watched_videos.size()) + " videos.");

    for (const auto& video : watched_videos) {
        log_message("Checking other users who watched video: " + video);
        for (const auto& [other_user, other_videos] : user_video_history) {
            if (other_user == user_id) continue;
            if (std::find(other_videos.begin(), other_videos.end(), video) != other_videos.end()) {
                log_message("User " + other_user + " also watched video: " + video);
                for (const auto& other_video : other_videos) {
                    if (std::find(watched_videos.begin(), watched_videos.end(), other_video) == watched_videos.end()) {
                        video_scores[other_video] += video_views[other_video];
                        log_message("Added score for video " + other_video + ": " + std::to_string(video_scores[other_video]));
                    }
                }
            }
        }
    }

    std::vector<std::pair<std::string, int>> sorted_recommendations(video_scores.begin(), video_scores.end());
    std::sort(sorted_recommendations.begin(), sorted_recommendations.end(),
              [](const auto& a, const auto& b) { return a.second > b.second; });

    log_message("Sorted recommendations for user " + user_id);

    std::vector<std::string> recommendations;
    for (const auto& [video, score] : sorted_recommendations) {
        recommendations.push_back(video);
        log_message("Top recommendation: " + video + " with score: " + std::to_string(score));
        if (recommendations.size() >= 10) break;
    }

    if (recommendations.size() < 6) {
        std::vector<std::string> all_videos;
        log_message("Not enough recommendations, gathering more videos.");
        for (const auto& [video, views] : video_views) {
            if (std::find(recommendations.begin(), recommendations.end(), video) == recommendations.end() &&
                std::find(watched_videos.begin(), watched_videos.end(), video) == watched_videos.end()) {
                all_videos.push_back(video);
                log_message("Adding video to fallback recommendations: " + video);
            }
        }

        std::random_device rd;
        std::mt19937 g(rd());
        std::shuffle(all_videos.begin(), all_videos.end(), g);

        while (recommendations.size() < 10 && !all_videos.empty()) {
            recommendations.push_back(all_videos.back());
            log_message("Added fallback recommendation: " + all_videos.back());
            all_videos.pop_back();
        }
    }

    return recommendations;
}

std::map<std::string, std::string> parse_message(const std::string& message) {
    std::map<std::string, std::string> result;
    std::istringstream iss(message);
    std::string line;
    while (std::getline(iss, line)) {
        size_t delimiter_pos = line.find(':');
        if (delimiter_pos != std::string::npos) {
            std::string key = line.substr(0, delimiter_pos);
            std::string value = line.substr(delimiter_pos + 1);
            log_message("Parsed message key: " + key + ", value: " + value);
            result[key] = value;
        } else {
            log_message("Invalid message line format: " + line);
        }
    }
    return result;
}

std::string create_response(const std::map<std::string, std::string>& data) {
    std::ostringstream oss;
    for (const auto& [key, value] : data) {
        oss << key << ":" << value << "\n";
        log_message("Adding to response - key: " + key + ", value: " + value);
    }
    return oss.str();
}

void handle_client(SOCKET client_sock) {
    char buffer[4096];
    while (true) {
        int read_bytes = recv(client_sock, buffer, sizeof(buffer), 0);
        if (read_bytes <= 0) {
            log_message("Connection closed by client or error receiving data.");
            break;
        }

        buffer[read_bytes] = '\0';
        std::string message(buffer);
        
        log_message("Received data: " + message);

        try {
            auto parsed_message = parse_message(message);
            std::string action = parsed_message["action"];

            std::map<std::string, std::string> response;

            if (action == "view") {
                std::string user_id = parsed_message["user_id"];
                std::string video_id = parsed_message["video_id"];

                user_video_history[user_id].push_back(video_id);
                video_views[video_id]++;
                log_message("Updated user history and video views for user " + user_id + ", video " + video_id);

                response["status"] = "success";
                log_message("Processed view action for user " + user_id + ", video " + video_id);
            }
            else if (action == "recommend") {
                std::string user_id = parsed_message["user_id"];
                std::vector<std::string> recommendations = get_recommendations(user_id);

                std::ostringstream rec_oss;
                for (const auto& rec : recommendations) {
                    rec_oss << rec << ",";
                    log_message("Adding recommendation to response: " + rec);
                }
                std::string rec_str = rec_oss.str();
                if (!rec_str.empty()) {
                    rec_str.pop_back(); // Remove trailing comma
                }

                response["recommendations"] = rec_str;
                log_message("Generated recommendations for user " + user_id + ": " + rec_str);
            }
            else if (action == "test") {
                response["status"] = "success";
                response["message"] = "Test successful";
                log_message("Processed test action");
            }
            else {
                response["status"] = "error";
                response["message"] = "Unknown action";
                log_message("Received unknown action: " + action);
            }

            std::string response_str = create_response(response);
            send(client_sock, response_str.c_str(), response_str.length(), 0);
            log_message("Sent response: " + response_str);
        }
        catch (std::exception& e) {
            log_message("Error processing message: " + std::string(e.what()));
            std::map<std::string, std::string> error_response;
            error_response["status"] = "error";
            error_response["message"] = "Error processing request";
            std::string error_response_str = create_response(error_response);
            send(client_sock, error_response_str.c_str(), error_response_str.length(), 0);
            log_message("Sent error response: " + error_response_str);
        }
    }
    closesocket(client_sock);
    log_message("Client socket closed.");
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        log_message("WSAStartup failed.");
        return 1;
    }

    const int server_port = 5566;
    SOCKET sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == INVALID_SOCKET) {
        log_message("Error creating socket: " + std::to_string(WSAGetLastError()));
        WSACleanup();
        return 1;
    }

    sockaddr_in sin;
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = INADDR_ANY;
    sin.sin_port = htons(server_port);

    if (bind(sock, (struct sockaddr *)&sin, sizeof(sin)) == SOCKET_ERROR) {
        log_message("Error binding socket: " + std::to_string(WSAGetLastError()));
        closesocket(sock);
        WSACleanup();
        return 1;
    }

    if (listen(sock, 5) == SOCKET_ERROR) {
        log_message("Error listening on socket: " + std::to_string(WSAGetLastError()));
        closesocket(sock);
        WSACleanup();
        return 1;
    }

    log_message("Server is listening on port " + std::to_string(server_port));

    std::vector<std::thread> client_threads;

    while (true) {
        sockaddr_in client_sin;
        int client_sin_len = sizeof(client_sin);
        SOCKET client_sock = accept(sock, (struct sockaddr *)&client_sin, &client_sin_len);
        if (client_sock == INVALID_SOCKET) {
            log_message("Error accepting client: " + std::to_string(WSAGetLastError()));
            continue;
        }

        log_message("New client connected from IP: " + std::string(inet_ntoa(client_sin.sin_addr)) + " on port " + std::to_string(ntohs(client_sin.sin_port)));
        client_threads.emplace_back(handle_client, client_sock);
    }

    // Clean up (this part will never be reached in this implementation)
    for (auto& t : client_threads) {
        t.join();
    }
    closesocket(sock);
    WSACleanup();
    return 0;
}
