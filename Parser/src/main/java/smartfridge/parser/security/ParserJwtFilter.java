package smartfridge.parser.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class ParserJwtFilter extends OncePerRequestFilter {
    private final JdbcTemplate jdbc;
    private final String secret;
    public ParserJwtFilter(JdbcTemplate jdbc, @Value("${security.jwt.secret}") String secret) {
        this.jdbc=jdbc;this.secret=secret;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                              FilterChain chain) throws ServletException, IOException {
        String header=request.getHeader("Authorization");
        if(header!=null && header.startsWith("Bearer ")) {
            Long id=null;
            try {
                var claims=Jwts.parser().verifyWith(Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                        .build().parseSignedClaims(header.substring(7)).getPayload();
                id=Long.valueOf(claims.getSubject());
            } catch(JwtException | IllegalArgumentException ignored) {
                
            }
            if(id!=null) {
                var roles=jdbc.queryForList("SELECT role FROM users WHERE id = ?",String.class,id);
                if(roles.size()==1 && ("USER".equals(roles.get(0)) || "ADMIN".equals(roles.get(0)))) {
                    var authentication=new UsernamePasswordAuthenticationToken(id,null,
                            List.of(new SimpleGrantedAuthority("ROLE_"+roles.get(0))));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        chain.doFilter(request,response);
    }
}
