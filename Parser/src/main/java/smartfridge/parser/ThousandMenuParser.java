package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import smartfridge.parser.factories.InstructionParserFactory;
import smartfridge.recipe.model.RecipeCard;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Component
public class ThousandMenuParser {
    private final String BASE_URL = "https://1000.menu/";
    private final InstructionParserFactory instructionParserFactory;
    private final RecipeCompositionParser compositionParser;
    public List<RecipeCard> parseOnePage(String url, int pageNumber) {
        List<RecipeCard> recipeCards = new ArrayList<>();
        String urlRes = url + "/" + pageNumber;

        log.info("Парсинг страницы: {}", urlRes);

        try {
            Long cardCounter = 0L;
            Document doc = Jsoup.connect(urlRes).get();
            Elements cards = doc.select("div.cn-item");

            for (Element element : cards) {
                if (element.hasClass("ads_enabled")) {
                    continue;
                }
                if (element.hasAttr("id") && element.attr("id").contains("ad")) {
                    continue;
                }

                String linkUrl = parseRecipeLinks(element);
                if (linkUrl == null) continue;

                RecipeCard recipeCard = RecipeCard.builder()
                        .id(cardCounter++)
                        .linkUrl(linkUrl)
                        .title(parseRecipeTitle(element))
                        .description(parseRecipeDescription(element))
                        .imageUrl(parseImage(element))
                        .calories(parseRecipeKKal(element))
                        .approximateTime(parseRecipeTime(element))
                        .ingredients(parseRecipeIngredients(element))
                        .build();
                recipeCards.add(recipeCard);
            }

            log.info("Найдено {} рецептов на странице {}", recipeCards.size(), pageNumber);

        } catch (Exception e) {
            log.error("Ошибка при парсинге страницы {}: {}", urlRes, e.getMessage());
        }

        return recipeCards;
    }

    public String parseRecipeDetails(String url) {
        return parseRecipeData(url).contentJson();
    }

    public ParsedRecipeDetails parseRecipeData(String url) {
        String urlRes = java.net.URI.create(BASE_URL).resolve(url).toString();
        try {
            return parseRecipeDocument(Jsoup.connect(urlRes).timeout(30000).get());
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось прочитать рецепт " + urlRes, e);
        }
    }

    ParsedRecipeDetails parseRecipeDocument(Document document) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        try {
            Elements element = document.select("span.description-text");

            ObjectNode recipe = mapper.createObjectNode();
            recipe.put("description", element.text());

            ArrayNode allSteps = instructionParserFactory.parseSteps(document, mapper);

            if (!allSteps.isEmpty()) {
                recipe.set("steps", allSteps);
            }

            var ingredients = compositionParser.ingredients(document);
            if (ingredients.isEmpty()) {
                throw new IllegalArgumentException("Не найден состав рецепта: проверьте разметку страницы");
            }
            return new ParsedRecipeDetails(mapper.writeValueAsString(recipe),
                    compositionParser.nutrition(document, "nutr_kcal", "calories"),
                    compositionParser.nutrition(document, "nutr_p", "proteinContent"),
                    compositionParser.nutrition(document, "nutr_f", "fatContent"),
                    compositionParser.nutrition(document, "nutr_c", "carbohydrateContent"), ingredients);

        } catch (Exception e) {
            throw new IllegalStateException("Ошибка при парсинге деталей рецепта", e);
        }
    }

    private String parseImage(Element card) {
        Elements imgTag = card.select("div.photo a img");
        String imageUrl = imgTag.attr("data-original");
        if (imageUrl.isEmpty()) {
            imageUrl = imgTag.attr("src");
        }
        return imageUrl;
    }

    private String parseRecipeLinks(Element card) {
        Elements recipeLinks = card.select("div.photo").select("a");
        String link = recipeLinks.attr("href");
        if (link.startsWith("/cooking")) {
            return link;
        }
        return null;
    }

    private String parseRecipeTitle(Element card) {
        Elements info = card.select("div.info-preview");
        return info.select("a.h5").first().text();
    }

    private List<String> parseRecipeIngredients(Element card) {
        List<String> ingredientsList = new ArrayList<>();
        Elements info = card.select("div.info-preview");
        Elements ingredients = info.select("div.mt-1 div.is-flex div.controls div.mt-2");

        for (Element element : ingredients) {
            String ingredientText = element.text();

            if (ingredientText.contains(",")) {
                String[] parts = ingredientText.split(",");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) {
                        ingredientsList.add(trimmed);
                    }
                }
            } else {
                ingredientsList.add(ingredientText);
            }
        }

        return ingredientsList;
    }
    private String parseRecipeTime(Element card) {
        Elements info = card.select("div.info-preview");
        return info.select("div.icons div.level-right")
                .first()
                .text();
    }

    private String parseRecipeKKal(Element card) {
        Elements info = card.select("div.info-preview");
        return info.select("div.icons div.level-left")
                .first()
                .text();
    }

    private String parseRecipeDescription(Element card) {
        Elements info = card.select("div.info-preview");
        return info.select("div.preview-text")
                .first()
                .text();
    }
}
