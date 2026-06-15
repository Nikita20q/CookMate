package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import smartfridge.parser.factories.InstructionParserFactory;
import smartfridge.recipe.model.RecipeCard;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@RequiredArgsConstructor
@Component
public class ThousandMenuParser {
    private String BASE_URL = "https://1000.menu/";
    private StringBuilder stringBuilder = new StringBuilder();
    private final InstructionParserFactory instructionParserFactory;

    public void cardParse(String url) {
        String urlRes = BASE_URL + url;
        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        try {
            Document document = Jsoup.connect(urlRes).get();
            Elements element = document.select("span.description-text");

            ObjectNode recipe = mapper.createObjectNode();
            recipe.put("description", element.text());

            System.out.println("Описание: " + element.text());

            ArrayNode allSteps = instructionParserFactory.parseSteps(document, mapper);

            if (allSteps.isEmpty()) {
                System.out.println("Тут нет списка шагов");
            } else {
                recipe.set("steps", allSteps);
                System.out.println(mapper.writeValueAsString(recipe));
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    public void parseAllPages(String url, int range) {
        for (int i = 1; i < range; i++) {
            List<RecipeCard> recipeCards = new ArrayList<>();
            stringBuilder.delete(0, stringBuilder.length());
            String urlRes = stringBuilder.append(url).append("/").append(i).toString();
            System.out.println("-".repeat(60));
            System.out.println(urlRes);
            try {
                Long cardCounter = 0L;
                Document doc = Jsoup.connect(urlRes).get();
                Elements cards = doc.select("div.cn-item");
                for (Element element : cards) {
                    if (element.hasClass("ads_enabled")) {
                        continue;
                    }
                    if (element.hasAttr("id") && cards.attr("id").contains("ad")) {
                        continue;
                    }
                    RecipeCard recipeCard = RecipeCard.builder()
                            .id(cardCounter++)
                            .linkUrl(parseRecipeLinks(element))
                            .title(parseRecipeTitle(element))
                            .description(parseRecipeDescription(element))
                            .imageUrl(parseImage(element))
                            .calories(parseRecipeKKal(element))
                            .approximateTime(parseRecipeTime(element))
                            .ingredients(parseRecipeIngredients(element))
                            .build();
                    recipeCards.add(recipeCard);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            for (var recipeCard : recipeCards) {
                String cardUrl = recipeCard.getLinkUrl();
                System.out.println(BASE_URL + cardUrl);
                cardParse(cardUrl);
//                System.out.println(recipeCard);
            }
        }
//        return recipeCards;
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
            ingredientsList.add(element.text());
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
