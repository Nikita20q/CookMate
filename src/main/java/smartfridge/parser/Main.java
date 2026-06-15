package smartfridge.parser;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.jsoup.nodes.Document;
import smartfridge.parser.factories.InstructionParserFactory;
import smartfridge.recipe.model.Steps;

import java.util.List;

public class Main {
    public static void main(String[] args) {
        ThousandMenuParser linkParser = new ThousandMenuParser(
                new InstructionParserFactory(List.of(new OlParser()))
        );

        linkParser.parseAllPages("https://1000.menu/catalog/drugoe", 2);

    }
}