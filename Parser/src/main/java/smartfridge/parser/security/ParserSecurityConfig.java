package smartfridge.parser.security;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class ParserSecurityConfig {
    @Bean SecurityFilterChain parserSecurity(HttpSecurity http,ParserJwtFilter jwt) throws Exception {
        return http.csrf(c->c.disable())
                .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e->e
                        .authenticationEntryPoint((request,response,exception)->{
                            response.setStatus(401);response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"status\":401,\"message\":\"Требуется авторизация\"}");
                        })
                        .accessDeniedHandler((request,response,exception)->{
                            response.setStatus(403);response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"status\":403,\"message\":\"Требуется роль ADMIN\"}");
                        }))
                .authorizeHttpRequests(a->a
                        .requestMatchers(HttpMethod.OPTIONS,"/**").permitAll()
                        .requestMatchers("/swagger-ui/**","/swagger-ui.html","/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/v1/parser/**").hasRole("ADMIN")
                        .anyRequest().denyAll())
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class).build();
    }
}
