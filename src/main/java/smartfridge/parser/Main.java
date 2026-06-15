package smartfridge.parser;


import smartfridge.parser.factories.InstructionParserFactory;

import java.util.List;

public class Main {
    public static void main(String[] args) {
        ThousandMenuParser linkParser = new ThousandMenuParser(
                new InstructionParserFactory(List.of(new OlParser(), new DivParser(), new ParagraphListParser()))
        );

        linkParser.parseAllPages("https://1000.menu/catalog/drugoe", 2);

    }
}