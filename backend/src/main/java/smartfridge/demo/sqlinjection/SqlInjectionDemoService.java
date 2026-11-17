package smartfridge.demo.sqlinjection;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataAccessException;
import smartfridge.exceptions.BusinessException;
import java.util.*;
@Service
public class SqlInjectionDemoService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public SqlInjectionDemoService(javax.sql.DataSource dataSource) {
        jdbc=new JdbcTemplate(dataSource);
        jdbc.setQueryTimeout(3);
        jdbc.setMaxRows(20);
        transaction=new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        transaction.setReadOnly(true);
        transaction.setTimeout(3);
    }

    public DemoResult byIngredients(List<String> components) {
        if(components==null || components.isEmpty() || components.size()>10)
            throw BusinessException.badRequest("Демо: от 1 до 10 ингредиентов");
        List<String> literals=new ArrayList<>();
        for(String component:components) {
            check(component);
            literals.add("'"+component.trim().toLowerCase(Locale.ROOT)+"'");
        }
        String sql="SELECT DISTINCT r.id, r.title, r.slug FROM public.recipes r "
                +"JOIN public.recipe_components rc ON rc.recipe_id=r.id "
                +"JOIN public.ingredients i ON i.id=rc.ingredient_id "
                +"WHERE LOWER(i.name) IN ("+String.join(",",literals)+") AND r.archived=false";
        return execute(sql);
    }

    public DemoResult bySlug(String slug) {
        check(slug);
        String sql="SELECT id, title, slug FROM public.recipes WHERE slug = '"+slug+"' AND archived=false";
        return execute(sql);
    }

    private void check(String value) {
        if(value==null || value.length()>200 || value.contains(";") || value.indexOf('\0')>=0)
            throw BusinessException.badRequest("Демо: максимум 200 символов, без разделителя операторов");
    }

    private DemoResult execute(String sql) {
        try {
            return transaction.execute(status->{
                jdbc.execute("SET TRANSACTION READ ONLY");
                jdbc.execute("SET LOCAL statement_timeout = '2s'");
                jdbc.execute("SET LOCAL lock_timeout = '1s'");
                return new DemoResult(sql,jdbc.queryForList(sql));
            });
        } catch(DataAccessException error) {
            throw BusinessException.badRequest("Демонстрационный SQL отклонён: синтаксис, права или лимит времени");
        }
    }

    public record DemoResult(String sql,List<Map<String,Object>> rows) {}
}
