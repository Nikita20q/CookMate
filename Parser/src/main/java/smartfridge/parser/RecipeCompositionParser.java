package smartfridge.parser;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class RecipeCompositionParser {
    private static final Pattern NUMBER = Pattern.compile("[0-9]+(?:[.,][0-9]+)?");

    public List<ParsedRecipeDetails.Ingredient> ingredients(Document document) {
        var result = new ArrayList<ParsedRecipeDetails.Ingredient>();
        for (var row : document.select("#recept-list .ingredient")) {
            String name = text(row.selectFirst(".name"));
            if (name.isBlank()) throw new IllegalArgumentException("Ингредиент без названия");
            Element unit = row.selectFirst("select option[selected]");
            if (unit == null) unit = row.selectFirst("select option");
            if (unit == null) unit = row.selectFirst(".type");
            result.add(new ParsedRecipeDetails.Ingredient(name,
                    quantity(text(row.selectFirst(".squant"))), text(unit)));
        }
        return List.copyOf(result);
    }

    public Integer nutrition(Document document, String id, String itemprop) {
        Element element = document.getElementById(id);
        if (element == null) element = document.selectFirst("[itemprop=" + itemprop + "]");
        if (element == null) return null;
        String value = element.hasAttr("content") ? element.attr("content") : element.text();
        var matcher = NUMBER.matcher(value.replace('\u00a0', ' '));
        if (!matcher.find()) return null;
        try {
            return new BigDecimal(matcher.group().replace(',', '.'))
                    .setScale(0, RoundingMode.HALF_UP).intValueExact();
        } catch (ArithmeticException ex) {
            return null;
        }
    }

    static Double quantity(String value) {
        String normalized = value.replace('\u00a0', ' ').replace('\u202f', ' ')
                .replace(',', '.').trim();
        if (normalized.isEmpty()) return null;
        normalized = normalized.replace("½", " 1/2").replace("¼", " 1/4")
                .replace("¾", " 3/4").replace("⅓", " 1/3").replace("⅔", " 2/3").trim();
        try {
            double number;
            if (normalized.matches("(?:[0-9]+\\s+)?[0-9]+/[0-9]+")) {
                String[] parts = normalized.split("\\s+");
                String[] fraction = parts[parts.length - 1].split("/");
                number = Double.parseDouble(fraction[0]) / Double.parseDouble(fraction[1]);
                if (parts.length == 2) number += Double.parseDouble(parts[0]);
            } else {
                normalized = normalized.replace(" ", "");
                if (!normalized.matches("[0-9]+(?:\\.[0-9]+)?")) return null;
                number = Double.parseDouble(normalized);
            }
            return Double.isFinite(number) && number >= 0 ? number : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String text(Element element) {
        return element == null ? "" : element.text().trim();
    }
}
