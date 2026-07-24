/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */

import {
    Tree, SchematicsException,
    SchematicContext,
  } from '@angular-devkit/schematics';
  import { findNodes} from '@schematics/angular/utility/ast-utils';
  import { InsertChange, Change, NoopChange, ReplaceChange } from '@schematics/angular/utility/change';
import { NgAddOption } from '../ng-add/schema';
import { strings } from '@angular-devkit/core';
import * as ts from 'typescript';
import * as path from 'path';
import { AverosAuthOption } from '../averos-auth/schema';
import { AverosAuthConfigOption } from '../averos-auth-config/schema';


export function getRouteInsertionPoint(
  routesListNode: ts.Node,
  routeStrings: string[]
): { insertPos: number; toAdd: string } {
  const children = routesListNode.getChildren();

  // Find the wildcard route node
  const wildcardIndex = children.findIndex(child => {
    const text = child.getText();
    return text.includes("path: '**'") || text.includes('path: "**"');
  });

  if (wildcardIndex !== -1) {
    // Check if there's a comma token just before the wildcard
    const prevSibling = children[wildcardIndex - 1];
    const prevIsComma = prevSibling?.getText().trim() === ',';

    // Insert right before the comma that precedes the wildcard (or before wildcard itself)
    const insertPos = prevIsComma
      ? prevSibling.getFullStart()
      : children[wildcardIndex].getFullStart();

    // We need to add a trailing comma on our last route, then a newline before the wildcard
    const joined = routeStrings.join(',\n  ');
    const toAdd = `,\n  ${joined}`;

    return { insertPos, toAdd };
  }

  // No wildcard — insert at end of SyntaxList
  const lastChild = children[children.length - 1];
  const hasTrailingComma = lastChild.getText().trim() === ',';
  const insertPos = routesListNode.getEnd();
  const prefix = hasTrailingComma ? '\n  ' : ',\n  ';
  const toAdd = `${prefix}${routeStrings.join(',\n  ')}`;

  return { insertPos, toAdd };
}

// Extract routesListNode
export function extractRoutesListNode(source: ts.SourceFile, routerModulePath: string): ts.Node {
  const routesNode = findNodes(source as any, ts.SyntaxKind.Identifier)
    .find(n => n.getText() === 'routes');

  if (!routesNode || !routesNode.parent) {
    throw new SchematicsException(`❌ Expected routes variable in ${routerModulePath}`);
  }

  let routesSiblings = routesNode.parent.getChildren();
  const routesNodeIndex = routesSiblings.indexOf(routesNode);
  routesSiblings = routesSiblings.slice(routesNodeIndex);

  const routesArrayLiteralExpressionNode = routesSiblings
    .find(n => n.kind === ts.SyntaxKind.ArrayLiteralExpression);
  if (!routesArrayLiteralExpressionNode) {
    throw new SchematicsException(`❌ routes array is not defined`);
  }

  const routesListNode = routesArrayLiteralExpressionNode.getChildren()
    .find(n => n.kind === ts.SyntaxKind.SyntaxList);
  if (!routesListNode) {
    throw new SchematicsException(`❌ routes array is not defined`);
  }

  return routesListNode;
}

export function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
    const text = host.read(modulePath);
    if (text === null) {
      throw new SchematicsException(`❌ File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString('utf-8');
  
    return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}
  
  
  /**
   * Add Import `import { symbolName } from fileName` if the import doesn't exit
   * already. Assumes fileToEdit can be resolved and accessed.
   * @param fileToEdit (file we want to add import to)
   * @param symbolName (item to import)
   * @param fileName (path to the file)
   * @param isDefault (if true, import follows style for importing default exports)
   * @return Change
   */
  
   export function insertImport(
                                  source: ts.SourceFile,
                                  fileToEdit: string,
                                  symbolName: string,
                                  fileName: string,
                                  isDefault = false
                                ): Change {
    const rootNode = source;
    const allImports = findNodes(rootNode as any, ts.SyntaxKind.ImportDeclaration);
  
    // get nodes that map to import statements from the file fileName
    const relevantImports = allImports.filter((node) => {
      // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
      const importFiles = node
        .getChildren()
        .filter((child) => child.kind === ts.SyntaxKind.StringLiteral)
        .map((n) => (n as any).text);
  
      return importFiles.filter((file) => (file === fileName) || file.startsWith(fileName)).length === 1;
    });
  
    if (relevantImports.length > 0) {
      let importsAsterisk = false;
      // imports from import file
      const imports: ts.Node[] = [];
      relevantImports.forEach((n) => {
        Array.prototype.push.apply(
          imports,
          findNodes(n, ts.SyntaxKind.Identifier)
        );
        if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
          importsAsterisk = true;
        }
      });
  
      // if imports * from fileName, don't add symbolName
      if (importsAsterisk) {
        return new NoopChange();
      }
  
      const importTextNodes = imports.filter(
        (n) => (n as ts.Identifier).text === symbolName
      );
  
      // insert import if it's not there
      if (importTextNodes.length === 0) {
        const fallbackPos =
          findNodes(
            relevantImports[0],
            ts.SyntaxKind.CloseBraceToken
          )[0].getStart() ||
          findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].getStart();
  
        return insertAfterLastOccurrence(
          imports,
          `, ${symbolName}`,
          fileToEdit,
          fallbackPos
        );
      }
  
      return new NoopChange();
    }
  
    // no such import declaration exists
    const useStrict = findNodes(rootNode as any, ts.SyntaxKind.StringLiteral).filter(
      (n) => n.getText() === 'use strict'
    );
    let fallbackPos = 0;
    if (useStrict.length > 0) {
      fallbackPos = useStrict[0].end;
    }
    const open = isDefault ? '' : '{ ';
    const close = isDefault ? '' : ' }';
    // if there are no imports or 'use strict' statement, insert import at beginning of file
    const insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
    const separator = insertAtBeginning ? '' : ';\n';
    const toInsert =
      `${separator}import ${open}${symbolName}${close}` +
      ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
  
    return insertAfterLastOccurrence(
      allImports as any,
      toInsert,
      fileToEdit,
      fallbackPos,
      ts.SyntaxKind.StringLiteral
    );
  }
  
  export function insertImportAsTextChange(
    source: ts.SourceFile,
    importName: string,
    importPath: string
  ): ts.TextChange[] {
    const existingImport = findExistingImport(source, importName, importPath);

  if (existingImport) {
    // Import already exists, no need to insert
    return [];
  }
    const allImports = source.statements.filter(ts.isImportDeclaration);
    const lastImport = allImports[allImports.length - 1];
  
    const insertPosition = lastImport ? lastImport.end : 0;
  
    const importStatement = `\n import { ${importName} } from '${importPath}';\n`;
  
    return [
      {
        span: { start: insertPosition, length: 0 },
        newText: importStatement,
      },
    ];
  }

  export function findExistingImport(
    sourceFile: ts.SourceFile,
    className: string,
    importPath: string
  ): boolean {
    // Step 1: Look for all import declarations
    const importDeclarations = sourceFile.statements.filter(ts.isImportDeclaration);
  
    // Step 2: Check if the import is already present
    return importDeclarations.some((importDecl) => {
      // Check the import path
      const importClause = importDecl.importClause;
      if (importClause) {
        // Check for named imports
        const namedBindings = importClause.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          return namedBindings.elements.some((el) => el.name.text === className) &&
                 importDecl.moduleSpecifier.getText().replace(/['"]/g, '') === importPath;
        }
      }
      return false;
    });
  }

  /**
 * Computes the relative import path from a source file to a target TypeScript file.
 * This function is used to determine the appropriate import path for a symbol (e.g., a class)
 * from one file to another in a TypeScript/Angular project.
 *
 * @param tree - The Angular virtual file system tree, used to navigate project files.
 * @param sourceFilePath - The file path of the source file (where the import will be added).
 * @param classToAddFilePath - The file path of the target file (where the class is defined).
 * @returns The relative import path as a string, formatted for TypeScript imports.
 *          - Ensures path separators are normalized for cross-platform compatibility.
 *          - Removes `.ts` extensions as they are not required in TypeScript imports.
 *          - Prepends './' to relative paths that do not start with it.
 *
 * @example
 * // Example usage:
 * const importPath = getImportPath(tree, '/src/app/services/class-a.service.ts', '/src/app/models/class-b.ts');
 * console.log(importPath); // Output: '../models/class-b'
 *
 * @throws An error if the file paths are invalid or if the relative path cannot be computed.
 */

  export function getImportPath(tree: Tree, sourceFilePath: string, classToAddFilePath: string): string {
    
    if (!tree.exists(sourceFilePath)) {
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }
    
    if (!tree.exists(classToAddFilePath)) {
      throw new Error(`Target file not found: ${classToAddFilePath}`);
    }
    // Step 1: Compute the relative path from the source file to the target file
    const relativePath = path.relative(path.dirname(sourceFilePath), classToAddFilePath);
  
    // Step 2: Ensure the path is properly formatted for imports
    let importPath = relativePath.replace(/\\/g, '/'); // Normalize path separators
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath; // Ensure relative paths start with './'
    }
  
    // Step 3: Remove the file extension for TypeScript imports
    importPath = importPath.replace(/\.ts$/, '');
  
    return importPath;
  }
  /**
   * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
   * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
   * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
   *
   * @param nodes insert after the last occurence of nodes
   * @param toInsert string to insert
   * @param file file to insert changes into
   * @param fallbackPos position to insert if toInsert happens to be the first occurence
   * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
   * @return Change instance
   * @throw Error if toInsert is first occurence but fall back is not set
   */
   export function insertAfterLastOccurrence(
    nodes: ts.Node[],
    toInsert: string,
    file: string,
    fallbackPos: number,
    syntaxKind?: ts.SyntaxKind
  ): Change {
    let lastItem = nodes.sort(nodesByPosition).pop() as any;
    if (!lastItem) {
      throw new Error();
    }
    if (syntaxKind) {
      lastItem = findNodes(lastItem as any, syntaxKind).sort(nodesByPosition).pop();
    }
    if (!lastItem && fallbackPos == undefined) {
      throw new Error(
        `tried to insert ${toInsert} as first occurence with no fallback position`
      );
    }
    const lastItemPosition: number = lastItem ? lastItem.end : fallbackPos;
  
    return new InsertChange(file, lastItemPosition, toInsert);
  }
  
  /**
   * Helper for sorting nodes.
   * @return function to sort nodes in increasing order of position in sourceFile
   */
   function nodesByPosition(first: any, second: any): number {
    return first.pos - second.pos;
  }


   export const isLanguageSupported = (languageCode: string): boolean => {
    
    switch(languageCode){
      case 'en':
        return true;
      case 'de':
        return true;
      case 'fr':
        return true;
      case 'tn':
        return true;
      case 'se':
        return true;
      case 'no':
        return true;
      default:
        return false; 
    }
  }

  export function getDecoratorMetadata(
    source: ts.SourceFile,
    identifier: string,
    module: string,
  ): ts.Node[] {
    const angularImports = findNodes(source as any, ts.SyntaxKind.ImportDeclaration)
      .map((node) => _angularImportsFromNode(node as any))
      .reduce((acc, current) => {
        for (const key of Object.keys(current)) {
          acc[key] = current[key];
        }
  
        return acc;
      }, {});
  
    return getSourceNodes(source)
      .filter((node) => {
        return (
          node.kind == ts.SyntaxKind.Decorator &&
          (node as ts.Decorator).expression.kind == ts.SyntaxKind.CallExpression
        );
      })
      .map((node) => (node as ts.Decorator).expression as ts.CallExpression)
      .filter((expr) => {
        if (expr.expression.kind == ts.SyntaxKind.Identifier) {
          const id = expr.expression as ts.Identifier;
  
          return id.text == identifier && angularImports[id.text] === module;
        } else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
          // This covers foo.NgModule when importing * as foo.
          const paExpr = expr.expression as ts.PropertyAccessExpression;
          // If the left expression is not an identifier, just give up at that point.
          if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
            return false;
          }
  
          const id = paExpr.name.text;
          const moduleId = (paExpr.expression as ts.Identifier).text;
  
          return id === identifier && angularImports[moduleId + '.'] === module;
        }
  
        return false;
      })
      .filter(
        (expr) =>
          expr.arguments[0] && expr.arguments[0].kind == ts.SyntaxKind.ObjectLiteralExpression,
      )
      .map((expr) => expr.arguments[0] as ts.ObjectLiteralExpression);
  }

  function _angularImportsFromNode(node: ts.ImportDeclaration): { [name: string]: string } {
    const ms = node.moduleSpecifier;
    let modulePath: string;
    switch (ms.kind) {
      case ts.SyntaxKind.StringLiteral:
        modulePath = (ms as ts.StringLiteral).text;
        break;
      default:
        return {};
    }
  
    if (!modulePath.startsWith('@angular/')) {
      return {};
    }
  
    if (node.importClause) {
      if (node.importClause.name) {
        // This is of the form `import Name from 'path'`. Ignore.
        return {};
      } else if (node.importClause.namedBindings) {
        const nb = node.importClause.namedBindings;
        if (nb.kind == ts.SyntaxKind.NamespaceImport) {
          // This is of the form `import * as name from 'path'`. Return `name.`.
          return {
            [nb.name.text + '.']: modulePath,
          };
        } else {
          // This is of the form `import {a,b,c} from 'path'`
          const namedImports = nb;
  
          return namedImports.elements
            .map((is: ts.ImportSpecifier) => (is.propertyName ? is.propertyName.text : is.name.text))
            .reduce((acc: { [name: string]: string }, curr: string) => {
              acc[curr] = modulePath;
  
              return acc;
            }, {});
        }
      }
  
      return {};
    } else {
      // This is of the form `import 'path';`. Nothing to do.
      return {};
    }
  }

/**
 * Get all the nodes from a source.
 * @param sourceFile The source file object.
 * @returns {Array<ts.Node>} An array of all the nodes in the source.
 */
 export function getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
  const nodes: ts.Node[] = [sourceFile];
  const result = [];

  while (nodes.length > 0) {
    const node = nodes.shift();

    if (node) {
      result.push(node);
      if (node.getChildCount(sourceFile) >= 0) {
        nodes.unshift(...node.getChildren());
      }
    }
  }

  return result;
}

export function getMetadataField(
  node: ts.ObjectLiteralExpression,
  metadataField: string,
): ts.ObjectLiteralElement[] {

  return (
    node.properties
      .filter(ts.isPropertyAssignment)
      // Filter out every fields that's not "metadataField". Also handles string literals
      // (but not expressions).
      .filter(({ name }) => {
        return (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name?.getText() === metadataField;
      })
  );
}

export function addApplicationInitializerProviderToModule(source: ts.SourceFile, modulePath: string, 
                                                          moduleName: string, moduleLocation: string): Change[] {
  
  let changes: Change[] = [];
  if(!source || !modulePath){
    return [new NoopChange()];
 }

  // add required import declarations
  const importAppInitModule = insertImport(source, modulePath, 'inject, provideAppInitializer', '@angular/core');
  const importAppInitService = insertImport(source, modulePath, moduleName, moduleLocation);
  // include httpclient imports here as well
  const importAppInitModuleHttpClient = insertImport(source, modulePath, 'provideHttpClient, withFetch, withInterceptorsFromDi', '@angular/common/http');
  changes = [importAppInitModule, importAppInitService, importAppInitModuleHttpClient];

  /// add applicationInitializer function declaration (just after the last import and before any other declaration)
  const nodes__ = (findNodes(source as any, ts.SyntaxKind.FunctionDeclaration) as unknown) as ts.DeclarationStatement[];
  const appInitializerServiceNode = nodes__?.find((n: ts.DeclarationStatement ) => n.name?.text === 'applicationInitializer');
  if (!appInitializerServiceNode){
     // add the ApplicationInitializerService declaration as a provider
     let parentNode = null;
     const importDeclarationNode = source.statements.find(n => n.kind == ts.SyntaxKind.ImportDeclaration);
     if (!importDeclarationNode){ // no import declaration found
        const classDeclarationNode = source.statements.find(n => n.kind == ts.SyntaxKind.ClassDeclaration)
          if (!classDeclarationNode){ // no class declaration found
            throw new Error(
              `❌ No Class Declaration Found!`
            )
          }
        parentNode = classDeclarationNode.parent;    
     } else {
      parentNode = importDeclarationNode.parent;
     }
     
     let data = `\n /******************** Custom application initializer loader: DO NOT REMOVE IT ********************/
export function applicationInitializer(applicationInitializerService: ApplicationInitializerService): () => Promise<any> {
  return () => applicationInitializerService.initialize();
}\n`;

    let registerappInitializerServiceChange = new InsertChange(modulePath,
      parentNode.getEnd() , data);
    changes.push(registerappInitializerServiceChange);
  }


  //// Add applicationInitializer to the list of module providers if not already added
  const nodes_ = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  let node: any = nodes_[0];

  // Find the decorator declaration.
  if (!node) {
    return [];
  }

  // Get all the children property assignment of object literals.
  const matchingProperties = getMetadataField(node, 'providers');

  if (matchingProperties.length===0){// 'provider' metadata not found in NGModule
    throw new Error(`❌ Could not find provider @NgModule metadata! Please check your angular project configuration. \n`);
  }

  //Check AppInitializer in providers
  const appInitializerServiceProviderNode = findNodes(node, ts.SyntaxKind.Identifier, 200, true)?.find(n => n.getText() === 'ApplicationInitializerService');
  if (!appInitializerServiceProviderNode){
     // add the ApplicationInitializerService declaration as a provider
     const targetNode = matchingProperties[0].getChildAt(2).getChildAt(1);
     let data = `\n provideAppInitializer(() => {
          const initializerFn = (applicationInitializer)(inject(ApplicationInitializerService));
          return initializerFn();
        }), provideHttpClient(withInterceptorsFromDi(), withFetch())`;
     let registerappInitializerServiceProviderChange = new InsertChange(modulePath, targetNode.getStart(),
             (targetNode.getChildCount()>0 ? `${data}, ` : data));
     changes.push(registerappInitializerServiceProviderChange);
  }
  return changes;
}


export function addClassToApplicationMainModuleProviders(source: ts.SourceFile, modulePath: string, 
  customClassName: string, customClassImportLocation: string): Change[] {

    let changes: Change[] = [];
    if(!source || !modulePath){
    return [new NoopChange()];
    }

    // add required import declarations
    const importClass = insertImport(source, modulePath, customClassName, customClassImportLocation);
  
    changes = [importClass];

    /// add applicationInitializer function declaration (just after the last import and before any other declaration)
    const nodes__ = (findNodes(source as any, ts.SyntaxKind.FunctionDeclaration) as unknown) as ts.DeclarationStatement[];

    //// Add the Class to the list of module providers if not already added
    const nodes_ = getDecoratorMetadata(source, 'NgModule', '@angular/core');
    let node: any = nodes_[0];

    // Find the decorator declaration.
    if (!node) {
    return [];
    }

    // Get all the children property assignment of object literals.
    const matchingProperties = getMetadataField(node, 'providers');

    if (matchingProperties.length===0){// 'provider' metadata not found in NGModule
    throw new Error(`❌ Could not find provider @NgModule metadata! Please check your angular project configuration. \n`);
    }

    //Check Custom Class declaration in NGModule providers
    const customClassProviderNode = findNodes(node, ts.SyntaxKind.Identifier, 200, true)?.find(n => n.getText() === customClassName);
    if (!customClassProviderNode){
    // add the Custom Class declaration as a provider
    const targetNode = matchingProperties[0].getChildAt(2).getChildAt(1);
    let data = customClassName;
    let registerCustomClassInProviderChange = new InsertChange(modulePath, targetNode.getStart(),
    (targetNode.getChildCount()>0 ? `${data},\n        ` : data));
    changes.push(registerCustomClassInProviderChange);
    }


    return changes;
}

export function addAverosCoreModuleToApplicationModuleImport(source: ts.SourceFile, modulePath: string, 
                                                             moduleName: string, moduleLocation: string, 
                                                             options: NgAddOption): Change[] {
  let changes: Change[] = [];

  if(!source || !modulePath){
    return [new NoopChange()];
 }
  // add all required imports if not already added
  const importAverosModule = insertImport(source, modulePath, moduleName, moduleLocation);
  const importBrowserModule = insertImport(source, modulePath, 'BrowserModule', '@angular/platform-browser');
  changes = [ importAverosModule, 
              importBrowserModule,
            ];


  /// add import to ngmodule if not already imported
 const nodes_ = getDecoratorMetadata(source, 'NgModule', '@angular/core');
 let node: any = nodes_[0];

 // Find the decorator declaration.
 if (!node) {
   return [];
 }

 // Get all the children property assignment of object literals.
 const matchingProperties = getMetadataField(node, 'imports');

 if (matchingProperties.length===0){
   // no imports found in the NGModule ==> procede to import what is needed
   // TOBE implemented
   return [new NoopChange()];
 }

 //Check AverosCoreModule
 const averosCoreModuleNode = findNodes(node, ts.SyntaxKind.Identifier, 200, true)?.find(n => n.getText() === 'AverosCoreModule');
 if (!averosCoreModuleNode) {
    // add the AverosCoreModule declaration
    const requestedNode = matchingProperties[0].getChildAt(2).getChildAt(1);
    let data = `AverosCoreModule.forRoot({ enableAuthentication: ${options.enableAuthentication}, enableExternalEntityMapping: ${options.enableExternalEntityMapping}, supportedLanguages: [] }),\n`;
    let registerAverosModuleChange = new InsertChange(modulePath, requestedNode.getStart(),
            data);
    changes.push(registerAverosModuleChange);
 }
  //Check BrowserModule
  const browserModuleNode = findNodes(node, ts.SyntaxKind.Identifier, 200, true)?.find(n => n.getText() === 'BrowserModule');
  if (!browserModuleNode){
    //  add the BrowserModule declaration
    const requestedNode = matchingProperties[0].getChildAt(2).getChildAt(1);
    let data = `BrowserModule`;
    let registerBrowserModuleChange = new InsertChange(modulePath, requestedNode.getEnd(),
            (requestedNode.getChildCount()>0 ? `, \n${data}` : data));
    changes.push(registerBrowserModuleChange);
  }
 
  return changes;
}

// ====================== AUTH PROVIDER & HTTP CONFIG ===========
// ===

/**
 * Get default provider configuration based on provider type
 */
function getDefaultProviderConfig(providerType: string): string {
  switch (providerType) {
    case 'AverosDummyAuthProvider':
      return `{
                    networkDelay: 0,
                    persistState: true,
                    defaultTokenLifetimeMinutes: 5,
                    authFlow: 'credentials'
                  }`;
    
    case 'AverosKeycloakAuthProvider':
      return `{
                    url: 'http://localhost:8080',
                    realm: 'my-realm',
                    clientId: 'angular-client',
                    enablePkce: true,
                    flow: 'standard',
                    enableTokenRefresh: true,
                    minValidity: 70,
                    checkLoginIframe: false,
                    redirectUri: window.location.origin,
                    postLogoutRedirectUri: window.location.origin + '/login',
                    scope: 'openid profile email roles',
                    debug: true,
                    loadUserProfileOnInit: true
                  }`;
    
    case 'AverosFirebaseAuthProvider':
      return `{
                    firebaseConfig: FIREBASE_CONFIG,
                    defaultProvider: 'google',
                    enablePopupFallback: true,
                    persistTokens: true,
                    defaultScopes: {
                      google: ['profile', 'email'],
                      github: ['user:email', 'read:user'],
                      facebook: ['email', 'public_profile']
                    },
                    selfManaged: true
                  }`;
    
    default:
      return `{}`;
  }
}

/**
 * Get default HTTP auth configuration structure
 */
function getDefaultHttpAuthConfig(): string {
  return `{
                tokenHeader: 'Authorization',
                tokenPrefix: 'Bearer',
                publicRoutes: ['/public/*', '/health', '/api/version'],
                unauthorizedRedirect: '/login',
                withCredentials: true,
                maxRefreshRetries: 2
              }`;
}
/**
 * Get provider name from provider type
 */
function getProviderName(options: AverosAuthOption): string {
  const providerMap: { [key: string]: string } = {
    'dummy': 'dummy',
    'keycloak': 'keycloak',
    'firebase': 'firebase',
    'google': 'google',
    'github': 'github',
    'custom': options.customProviderClassName || 'custom'
  };
  return providerMap[options.provider.toLowerCase()] || options.provider.toLowerCase();
}

/**
 * Check if authProvidersConfig uses single provider structure
 */
export function isSingleProviderStructure(authProvidersNode: ts.ObjectLiteralExpression): boolean {
  const properties = authProvidersNode.properties;
  
  // Single provider structure has: name, provider, config
  const hasName = properties.some(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'name'
  );
  
  const hasProvider = properties.some(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'provider'
  );
  
  // Multiple provider structure has: providers (array), defaultProvider
  const hasProviders = properties.some(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'providers'
  );
  
  return hasName && hasProvider && !hasProviders;
}

/**
 * Get the current provider name from single provider structure
 */
export function getSingleProviderName(authProvidersNode: ts.ObjectLiteralExpression): string {
  const properties = authProvidersNode.properties;
  
  const nameProperty = properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'name'
  ) as ts.PropertyAssignment;
  
  if (nameProperty && ts.isStringLiteral(nameProperty.initializer)) {
    return nameProperty.initializer.text;
  }
  
  return '';
}

/**
 * Get the current provider configuration from single provider structure
 */
function extractSingleProviderConfig(authProvidersNode: ts.ObjectLiteralExpression): string {
  return authProvidersNode.getText();
}

/**
 * Convert single provider structure to multiple provider structure
 */
function convertToMultiProviderStructure(
  existingConfig: string,
  newProviderName: string,
  newProviderType: string,
  newProviderConfig: string,
  defaultProvider: string
): string {
  // Extract name, provider, and config from existing single provider
  const nameMatch = existingConfig.match(/name:\s*['"]([^'"]+)['"]/);
  const providerMatch = existingConfig.match(/provider:\s*(\w+)/);
  const configMatch = existingConfig.match(/config:\s*(\{[\s\S]*?\})\s*(?:,|\})/);
  
  const existingName = nameMatch ? nameMatch[1] : 'dummy';
  const existingProvider = providerMatch ? providerMatch[1] : 'AverosDummyAuthProvider';
  const existingConfigObj = configMatch ? configMatch[1] : '{}';
  
  return `{
              defaultProvider: '${defaultProvider}',
              providers: [
                {
                  name: '${existingName}',
                  provider: ${existingProvider},
                  config: ${existingConfigObj}
                },
                {
                  name: '${newProviderName}',
                  provider: ${newProviderType},
                  config: ${newProviderConfig}
                }
              ],
              config: {
                persistState: true,
                persistActiveProvider: true
              }
            }`;
}
 
/**
 * Add or update provider in existing multiple provider structure
 */
function addOrUpdateProviderInMultiStructure(
  authProvidersNode: ts.ObjectLiteralExpression,
  newProviderName: string,
  newProviderType: string,
  newProviderConfig: string,
  forUpdate: boolean,
  setAsDefault: boolean
): { position: number; text: string; isUpdate: boolean; defaultProviderChange?: { position: number; text: string } } | null {
  const properties = authProvidersNode.properties;
  
  // Find the providers array
  const providersProperty = properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'providers'
  ) as ts.PropertyAssignment;
  
  if (!providersProperty) {
    return null;
  }
  
  const providersArray = providersProperty.initializer;
  if (!ts.isArrayLiteralExpression(providersArray)) {
    return null;
  }
  
  // Check if provider already exists
  const existingProviderIndex = providersArray.elements.findIndex(el => {
    if (ts.isObjectLiteralExpression(el)) {
      const nameProperty = el.properties.find(p => 
        ts.isPropertyAssignment(p) && 
        ts.isIdentifier(p.name) && 
        p.name.text === 'name'
      ) as ts.PropertyAssignment;
      
      if (nameProperty && ts.isStringLiteral(nameProperty.initializer)) {
        return nameProperty.initializer.text === newProviderName;
      }
    }
    return false;
  });
  
  const newProviderText = `{
                  name: '${newProviderName}',
                  provider: ${newProviderType},
                  config: ${newProviderConfig}
                }`;
  
  let result: { position: number; text: string; isUpdate: boolean; defaultProviderChange?: { position: number; text: string } } | null = null;
  
  if (existingProviderIndex !== -1 && forUpdate) {
    // Update existing provider
    const existingProvider = providersArray.elements[existingProviderIndex];
    result = {
      position: existingProvider.getStart(),
      text: newProviderText,
      isUpdate: true
    };
  } else if (existingProviderIndex === -1) {
    // Add new provider
    const lastElement = providersArray.elements[providersArray.elements.length - 1];
    result = {
      position: lastElement.getEnd(),
      text: `,
                ${newProviderText}`,
      isUpdate: false
    };
  }
  
  // Handle defaultProvider update if setAsDefault is true
  if (result && setAsDefault) {
    const defaultProviderProperty = properties.find(p => 
      ts.isPropertyAssignment(p) && 
      ts.isIdentifier(p.name) && 
      p.name.text === 'defaultProvider'
    ) as ts.PropertyAssignment;
    
    if (defaultProviderProperty && ts.isStringLiteral(defaultProviderProperty.initializer)) {
      result.defaultProviderChange = {
        position: defaultProviderProperty.initializer.getStart(),
        text: `'${newProviderName}'`
      };
    }
  }
  
  return result;
}

/**
 * Update existing single provider configuration (used when forUpdate is true and same provider)
 */
function createUpdatedSingleProviderConfig(
  newProviderName: string,
  newProviderType: string,
  newProviderConfig: string
): string {
  return `{
              name: '${newProviderName}',
              provider: ${newProviderType},
              config: ${newProviderConfig}
            }`;
}

/**
 * Determine the default provider based on options and current state
 */
function determineDefaultProvider(
  options: AverosAuthOption,
  providerName: string,
  existingProviderName?: string
): string {
  // If setAsDefault flag is set, use the current provider
  if (options.setAsDefault) {
    return providerName;
  }
  
  // Otherwise, use the existing provider (first one when converting from single)
  if (existingProviderName) {
    return existingProviderName;
  }
  
  // Fallback to current provider
  return providerName;
}

export function addOrUpdateAverosAuthProvider(  source: ts.SourceFile, // ts source file 
                                                modulePath: string, // sourcePath ex. PROJECT_HOME/src
                                                moduleName: string, // Class Name ex. AverosDummyAuthProvider
                                                moduleLocation: string, // ex. @averos/ui-platform
                                                options: AverosAuthOption): Change[] {
  let changes: Change[] = [];
  if(!source || !modulePath){
    return [new NoopChange()];
 }
  // add all required imports if not already added
  const importAuthProviderModule = insertImport(source, modulePath, moduleName, moduleLocation);
  changes.push(importAuthProviderModule);

  /// add import to ngmodule if not already imported

  // Find NgModule decorator
 const ngModuleImportsNodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
 const ngModuleImportsNode: any = ngModuleImportsNodes[0];

 // Find the decorator declaration.
 if (!ngModuleImportsNode) {
   return [];
 }

 // Get imports array
 const importsArray = getMetadataField(ngModuleImportsNode, 'imports');
 if (importsArray.length===0){
   // no imports found in the NGModule ==> create the import and add the needed import
   // TOBE implemented
   return [new NoopChange()];
 }

 // Check if AverosCoreModule exists
 const averosCoreModuleNode = findNodes(ngModuleImportsNode, ts.SyntaxKind.Identifier, 200, true)?.find(
                              n => n.getText() === 'AverosCoreModule');

  const providerName = getProviderName(options);
  const providerConfig = getDefaultProviderConfig(moduleName);

 if (!averosCoreModuleNode) { // No averos module found => create a default one
    const insertCoreModule = insertImport(source, modulePath, 'AverosCoreModule', '@averos/ui-platform');
    changes.push(insertCoreModule);
    // Add AverosCoreModule with single provider structure
    const requestedNode = importsArray[0].getChildAt(2).getChildAt(1);
    const data = `AverosCoreModule.forRoot({
            enableAuthentication: true,
            enableExternalEntityMapping: true,
            debug: true,
            logLevel: 'DEBUG',
            supportedLanguages: ["en"],
            authProvidersConfig: {
              name: '${providerName}',
              provider: ${moduleName},
              config: ${providerConfig}
            }
        }),\n`;

    changes.push(new InsertChange(modulePath, requestedNode.getStart(), data));
    return changes;
 }

 // AverosCoreModule exists - find the forRoot call to update its authProvidersConfig
  // The structure is: AverosCoreModule.forRoot(..., authProvidersConfig:{},...)
  // averosCoreModuleNode is "AverosCoreModule"
  // Its parent should be PropertyAccessExpression (AverosCoreModule.forRoot)
  // The parent of that should be CallExpression (AverosCoreModule.forRoot(...))

  let forRootCall: ts.CallExpression | null = null;

  // Try to find the CallExpression
  // Walk up the tree to find the CallExpression
  let currentNode: ts.Node = averosCoreModuleNode;

  // Go up to PropertyAccessExpression (AverosCoreModule.forRoot)
  if (currentNode.parent && ts.isPropertyAccessExpression(currentNode.parent)) {
    const propAccess = currentNode.parent;
    // Check if it's the 'forRoot' property
    if (propAccess.name.text === 'forRoot') {
      // The parent of PropertyAccessExpression should be CallExpression
      if (propAccess.parent && ts.isCallExpression(propAccess.parent)) {
        forRootCall = propAccess.parent;
      }
    }
  }

  if (!forRootCall) {
    // AverosCoreModule exists but forRoot() is not called
    // This shouldn't normally happen
    return changes;
  }

  // Check if there are arguments to forRoot
  if (forRootCall.arguments.length === 0) {
    // forRoot() called without arguments - shouldn't happen
    return changes;
  }

  const configArg = forRootCall.arguments[0];
  if (!ts.isObjectLiteralExpression(configArg)) {
    return changes;
  }

  // Find authProvidersConfig property
  const authProvidersProperty = configArg.properties.find(p =>
    ts.isPropertyAssignment(p) &&
    ts.isIdentifier(p.name) &&
    p.name.text === 'authProvidersConfig'
  ) as ts.PropertyAssignment;

  // No Auth Provider configured yet
  if (!authProvidersProperty) {
    // No Auth Provider configured yet => Add authProvidersConfig with single provider structure
    const lastProperty = configArg.properties[configArg.properties.length - 1];
    const newAuthConfig = `,
            authProvidersConfig: {
              name: '${providerName}',
              provider: ${moduleName},
              config: ${providerConfig}
            }`;
    
    changes.push(new InsertChange(modulePath, lastProperty.getEnd(), newAuthConfig));
    return changes;
  }

  // There is already one or more auth providers configured
  const authProvidersNode = authProvidersProperty.initializer;
  if (!ts.isObjectLiteralExpression(authProvidersNode)) {
    return changes;
  }

  const isSingleProvider = isSingleProviderStructure(authProvidersNode);
  // SINGLE PROVIDER
  if (isSingleProvider) {
    // Get existing provider name
    const existingProviderName = getSingleProviderName(authProvidersNode);

    if (existingProviderName === providerName) {
        // Same provider already exists
      if (options.forUpdate) {
        // Update existing single provider
        const newConfig = createUpdatedSingleProviderConfig(
          providerName,
          moduleName,
          providerConfig
        );
        
        changes.push(
          new ReplaceChange(
            modulePath,
            authProvidersNode.getStart(),
            authProvidersNode.getText(),
            newConfig
          )
        );
      } 
    // If NOT forUpdate + same name => do nothing (no-op), prevents duplication
    return changes;
  
    }
      // Different provider => convert to multi-provider structure
      const existingConfig = extractSingleProviderConfig(authProvidersNode);
      const defaultProvider = determineDefaultProvider(options, providerName, existingProviderName);

      const newMultiConfig = convertToMultiProviderStructure(
        existingConfig,
        providerName,
        moduleName,
        providerConfig,
        defaultProvider
      );
      
      changes.push(
        new ReplaceChange(
          modulePath,
          authProvidersNode.getStart(),
          authProvidersNode.getText(),
          newMultiConfig
        )
      );
  } else {
    // MULTIPLE PROVIDERS
    // Already multi-provider structure - add or update provider
    const updateInfo = addOrUpdateProviderInMultiStructure(
      authProvidersNode,
      providerName,
      moduleName,
      providerConfig,
      options.forUpdate || false,
      options.setAsDefault || false
    );
    
    if (updateInfo) {
      if (updateInfo.isUpdate) {
        // // Update existing provider in array => Find the provider to update
        const properties = authProvidersNode.properties;
        const providersProperty = properties.find(p => 
          ts.isPropertyAssignment(p) && 
          ts.isIdentifier(p.name) && 
          p.name.text === 'providers'
        ) as ts.PropertyAssignment;
        
        if (providersProperty && ts.isArrayLiteralExpression(providersProperty.initializer)) {
          const providersArray = providersProperty.initializer;
          const providerToUpdate = providersArray.elements.find(el => {
            if (ts.isObjectLiteralExpression(el)) {
              const nameProperty = el.properties.find(p => 
                ts.isPropertyAssignment(p) && 
                ts.isIdentifier(p.name) && 
                p.name.text === 'name'
              ) as ts.PropertyAssignment;
              
              if (nameProperty && ts.isStringLiteral(nameProperty.initializer)) {
                return nameProperty.initializer.text === providerName;
              }
            }
            return false;
          });
          
          if (providerToUpdate) {
            changes.push(
              new ReplaceChange(
                modulePath,
                providerToUpdate.getStart(),
                providerToUpdate.getText(),
                updateInfo.text
              )
            );
          }
        }
      } else {
        // Add new provider to array
        changes.push(new InsertChange(modulePath, updateInfo.position, updateInfo.text));
      }

      if (updateInfo.defaultProviderChange) {
        const defaultProviderProperty = authProvidersNode.properties.find(p => 
          ts.isPropertyAssignment(p) && 
          ts.isIdentifier(p.name) && 
          p.name.text === 'defaultProvider'
        ) as ts.PropertyAssignment;
        
        if (defaultProviderProperty && ts.isStringLiteral(defaultProviderProperty.initializer)) {
          changes.push(
            new ReplaceChange(
              modulePath,
              defaultProviderProperty.initializer.getStart(),
              defaultProviderProperty.initializer.getText(),
              updateInfo.defaultProviderChange.text
            )
          );
        }
      }
    }
  }
  return changes;
}

/**
 * Sets up either auth provider configuration parameters 
 * Or the global HTTP Auth Configuration parameters
 */
export function configureAverosAuthProvider(
  source: ts.SourceFile,
  modulePath: string,
  options: AverosAuthConfigOption,
  context: SchematicContext
): Change[] {

  if (!source || !modulePath) {
    return [new NoopChange()];
  }

  const forRootCall: ts.CallExpression | null = findAverosCoreModuleForRootCall(source, context);

  if (!forRootCall || forRootCall.arguments.length === 0) {
    context.logger.error(`❌ AverosCoreModule.forRoot() not found or has no configuration`);
    return [];
  }

  // Handle httpConfig mode
  if (options.httpConfig) {
    return configureHttpAuthConfig(forRootCall, modulePath, options, context);
  }

  // Find authProvidersConfig property
  const authProvidersProperty = findAuthProvidersConfig(forRootCall);

  if (!authProvidersProperty) {
    context.logger.error(`❌ No authentication providers configured. Please run "ng g @averos/workflow:averos-auth --provider ${options.provider}" first.`);
    return [];
  }

  const authProvidersNode = authProvidersProperty.initializer;
  if (!ts.isObjectLiteralExpression(authProvidersNode)) {
    return [];
  }

  // Check if single or multi-provider structure
  const isSingleProvider = isSingleProviderStructure(authProvidersNode);

  if (isSingleProvider) {
    return updateSingleProviderConfig(authProvidersNode, modulePath, options, context);
  } else {
    return updateMultiProviderConfig(authProvidersNode, modulePath, options, context);
  }
}

/**
 * Configure httpAuthConfig in AverosCoreModule.forRoot()
 */
function configureHttpAuthConfig(
  forRootCall: ts.CallExpression,
  modulePath: string,
  options: AverosAuthConfigOption,
  context: SchematicContext
): Change[] {
  
  const configArg = forRootCall.arguments[0];
  if (!ts.isObjectLiteralExpression(configArg)) {
    return [];
  }

  // Find httpAuthConfig property
  const httpAuthConfigProperty = findHttpAuthConfig(forRootCall);

  if (!httpAuthConfigProperty) {
    // httpAuthConfig doesn't exist - create it with default values and the requested key
    context.logger.info(`➕ Creating httpAuthConfig with default values`);
    
    const defaultConfig = getDefaultHttpAuthConfig();
    const keys = options.key.split('.');
    
    // Update the default config with the requested key/value
    const updatedConfig = updateDefaultConfigValue(defaultConfig, keys, options.value);
    
    const lastProperty = configArg.properties[configArg.properties.length - 1];
    const newHttpAuthConfig = `,
            httpAuthConfig: ${updatedConfig}`;
    
    return [new InsertChange(modulePath, lastProperty.getEnd(), newHttpAuthConfig)];
  }

  // httpAuthConfig exists - update it
  const httpAuthConfigNode = httpAuthConfigProperty.initializer;
  if (!ts.isObjectLiteralExpression(httpAuthConfigNode)) {
    context.logger.error(`❌ httpAuthConfig is not a valid object`);
    return [];
  }

  return updateConfigObject(httpAuthConfigNode, modulePath, options, context);
}

function updateSingleProviderConfig(
  authProvidersNode: ts.ObjectLiteralExpression,
  modulePath: string,
  options: AverosAuthConfigOption,
  context: SchematicContext
): Change[] {
  const properties = authProvidersNode.properties;
  
  // Get provider name
  const nameProperty = properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'name'
  ) as ts.PropertyAssignment;
  
  if (!nameProperty || !ts.isStringLiteral(nameProperty.initializer)) {
    context.logger.error(`❌ Could not determine provider name`);
    return [];
  }

  const providerName = nameProperty.initializer.text;

  if (providerName !== options.provider.toLowerCase()) {
    context.logger.error(`❌ Provider "${options.provider}" not found. Current provider is "${providerName}". Please run "ng g @averos/workflow:averos-auth --provider ${options.provider}" first.`);
    return [];
  }

  // Find config property
  const configProperty = properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'config'
  ) as ts.PropertyAssignment;

  if (!configProperty || !ts.isObjectLiteralExpression(configProperty.initializer)) {
    context.logger.error(`❌ Provider config not found`);
    return [];
  }

  return updateConfigObject(configProperty.initializer, modulePath, options, context);
}

function updateMultiProviderConfig(
  authProvidersNode: ts.ObjectLiteralExpression,
  modulePath: string,
  options: AverosAuthConfigOption,
  context: SchematicContext
): Change[] {

  const targetProvider = findProviderInMultiStructure(authProvidersNode, options.provider.toLowerCase());
   
  if (!targetProvider || !ts.isObjectLiteralExpression(targetProvider)) {
    context.logger.error(`❌ Provider "${options.provider}" not found. Please run "ng g @averos/workflow:averos-auth --provider ${options.provider}" first.`);
    return [];
  }

  const providerConfig = getProviderConfigObject(targetProvider);
  if (!providerConfig){
    context.logger.error(`❌ Provider config not found`);
    return [];
  }

  return updateConfigObject(providerConfig, modulePath, options, context);
}

/**
 * Update default config string with requested key/value
 */
function updateDefaultConfigValue(
  defaultConfig: string,
  keys: string[],
  value: string
): string {
  // Parse the default config
  const configMatch = defaultConfig.match(/\{([\s\S]*)\}/);
  if (!configMatch) return defaultConfig;

  const configContent = configMatch[1];
  const newValue = parseValue(value);
  
  // For simple keys (no nesting), replace if exists or add
  if (keys.length === 1) {
    const key = keys[0];
    const keyRegex = new RegExp(`${key}:\\s*[^,}]+`, 'g');
    
    if (keyRegex.test(configContent)) {
      // Replace existing value
      const updatedContent = configContent.replace(keyRegex, `${key}: ${newValue}`);
      return `{\n${updatedContent}\n              }`;
    } else {
      // Add new key
      return `{\n${configContent.trim()},\n                ${key}: ${newValue}\n              }`;
    }
  } else {
    // For nested keys, add the nested structure
    let nestedStructure = newValue;
    for (let i = keys.length - 2; i >= 0; i--) {
      nestedStructure = `{\n${' '.repeat((keys.length - i) * 2)}${keys[i + 1]}: ${nestedStructure}\n${' '.repeat((keys.length - i - 1) * 2)}}`;
    }
    return `{\n${configContent.trim()},\n                ${keys[0]}: ${nestedStructure}\n              }`;
  }
}

function updateConfigObject(
  configNode: ts.ObjectLiteralExpression,
  modulePath: string,
  options: AverosAuthConfigOption,
  context: SchematicContext
): Change[] {
  const keys = options.key.split('.');
  const changes: Change[] = [];

  // Navigate to the target property
  let nodeProperty = navigateNestedProperty(configNode, keys);

  const currentObject = nodeProperty.parent;
  const targetProperty: ts.PropertyAssignment | undefined = nodeProperty.property;
  const depth = nodeProperty.depth;
  const isLastKey = depth === keys.length - 1;

  const key = keys.slice(depth); 
  if (!targetProperty) {
      if (isLastKey) {
        // Key doesn't exist - add it
        context.logger.info(`➕ Adding new configuration key: ${options.key}`);
        
        return addNewConfigKey(currentObject, keys.slice(depth), options.value, modulePath);
      } else {
        context.logger.error(`❌ Configuration path "${options.key}" not found. Parent key "${key}" does not exist.`);
        return [];
      }
  }

  if (isLastKey) {
      // Found the target property - update its value
      const newValue = parseValue(options.value);
      changes.push(
        new ReplaceChange(
          modulePath,
          targetProperty.initializer.getStart(),
          targetProperty.initializer.getText(),
          newValue
        )
      );
      context.logger.info(`✏️  Updating ${options.key} = ${newValue}`);
      return changes;
    } else {
      // Navigate deeper
      if (!ts.isObjectLiteralExpression(targetProperty.initializer)) {
        context.logger.error(`❌ Configuration path "${options.key}" is invalid. "${key}" is not an object.`);
        return [];
      }
    }

  return changes;
}

function addNewConfigKey(
  configNode: ts.ObjectLiteralExpression,
  keys: string[],
  value: string,
  modulePath: string
): Change[] {
  const changes: Change[] = [];
  
  if (keys.length === 1) {
    // Simple key addition
    const newValue = parseValue(value);
    const lastProperty = configNode.properties[configNode.properties.length - 1];
    
    let insertText: string;
    if (configNode.properties.length === 0) {
      // Empty object
      insertText = `${keys[0]}: ${newValue}`;
    } else {
      // Add after last property
      insertText = `,\n                    ${keys[0]}: ${newValue}`;
    }

    const insertPos = lastProperty ? lastProperty.getEnd() : configNode.getStart() + 1;
    
    changes.push(
      new ReplaceChange(
        modulePath,
        insertPos,
        '',
        insertText
      )
    );
  } else {
    // Nested key addition - create nested object structure
    const newValue = parseValue(value);
    let nestedStructure = newValue;
    
    // Build from innermost to outermost
    for (let i = keys.length - 2; i >= 0; i--) {
      nestedStructure = `{\n${' '.repeat((keys.length - i) * 2)}${keys[i + 1]}: ${nestedStructure}\n${' '.repeat((keys.length - i - 1) * 2)}}`;
    }

    const lastProperty = configNode.properties[configNode.properties.length - 1];
    let insertText: string;
    
    if (configNode.properties.length === 0) {
      insertText = `${keys[0]}: ${nestedStructure}`;
    } else {
      insertText = `,\n                    ${keys[0]}: ${nestedStructure}`;
    }

    const insertPos = lastProperty ? lastProperty.getEnd() : configNode.getStart() + 1;
    
    changes.push(
      new ReplaceChange(
        modulePath,
        insertPos,
        '',
        insertText
      )
    );
  }

  return changes;
}

function parseValue(value: string): string {
  const trimmed = value.trim();
  // Check for standard primitives first to avoid unnecessary JSON parsing
  if (trimmed === 'true' || trimmed === 'false') return trimmed;
  if (!isNaN(Number(trimmed)) && trimmed !== "") return trimmed;

  try {
    // verify if it's already valid JSON (Objects, Arrays, or Quoted Strings)
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    // Fallback: If it looks like an array or object just return it as is.
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          return trimmed;
        }
    // error => it's likely a raw string. 
    // Only wrap in quotes if it's not already quoted.
    const isQuoted = (value.startsWith('"') && value.endsWith('"')) || 
                     (value.startsWith("'") && value.endsWith("'"));

    return isQuoted ? value : `'${value}'`;
  }
}

/**
 * Find the AverosCoreModule.forRoot() call expression
 * Returns the CallExpression if found, null otherwise
 */
function findAverosCoreModuleForRootCall(
  source: ts.SourceFile,
  context: SchematicContext
): ts.CallExpression | null {

  // Find NgModule decorator
  const ngModuleImportsNodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  const ngModuleImportsNode: any = ngModuleImportsNodes[0];

  if (!ngModuleImportsNode) {
    context.logger.error(`❌ Could not find @NgModule decorator`);
    return null;
  }

  // Get imports array
  const importsArray = getMetadataField(ngModuleImportsNode, 'imports');
  if (importsArray.length === 0) {
    context.logger.error(`❌ Could not find imports in @NgModule`);
    return null;
  }

  // Check if AverosCoreModule exists
  const averosCoreModuleNode = findNodes(
    ngModuleImportsNode, 
    ts.SyntaxKind.Identifier, 
    200, 
    true
  )?.find(n => n.getText() === 'AverosCoreModule');

  if (!averosCoreModuleNode) {
    context.logger.error(`❌ AverosCoreModule not found. Please run "ng g @averos/workflow:averos-auth" first.`);
    return null;
  }

  // Try to find the CallExpression
  // Walk up the tree to find the CallExpression
  let currentNode: ts.Node = averosCoreModuleNode;

  // Go up to PropertyAccessExpression (AverosCoreModule.forRoot)
  if (currentNode.parent && ts.isPropertyAccessExpression(currentNode.parent)) {
    const propAccess = currentNode.parent;
    if (propAccess.name.text === 'forRoot') {
      if (propAccess.parent && ts.isCallExpression(propAccess.parent)) {
        return propAccess.parent;
      }
    }
  }
  return null;
}

/**
 * Find authProvidersConfig in AverosCoreModule.forRoot() configuration
 */
function findAuthProvidersConfig(
  forRootCall: ts.CallExpression
): ts.PropertyAssignment | null {
  if (forRootCall.arguments.length === 0) {
    return null;
  }

  const configArg = forRootCall.arguments[0];
  if (!ts.isObjectLiteralExpression(configArg)) {
    return null;
  }

  return configArg.properties.find(p =>
    ts.isPropertyAssignment(p) &&
    ts.isIdentifier(p.name) &&
    p.name.text === 'authProvidersConfig'
  ) as ts.PropertyAssignment || null;
}

/**
 * Find httpAuthConfig in AverosCoreModule.forRoot() configuration
 */
function findHttpAuthConfig(
  forRootCall: ts.CallExpression
): ts.PropertyAssignment | null {
  if (forRootCall.arguments.length === 0) {
    return null;
  }

  const configArg = forRootCall.arguments[0];
  if (!ts.isObjectLiteralExpression(configArg)) {
    return null;
  }

  return configArg.properties.find(p =>
    ts.isPropertyAssignment(p) &&
    ts.isIdentifier(p.name) &&
    p.name.text === 'httpAuthConfig'
  ) as ts.PropertyAssignment || null;
}

/**
 * Find a specific provider in multi-provider structure by name
 */
function findProviderInMultiStructure(
  authProvidersNode: ts.ObjectLiteralExpression,
  providerName: string
): ts.ObjectLiteralExpression | null {
  if (!authProvidersNode || !providerName){
    return null;
  }
  const properties = authProvidersNode.properties;
  
  const providersProperty = properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'providers'
  ) as ts.PropertyAssignment;
  
  if (!providersProperty || !ts.isArrayLiteralExpression(providersProperty.initializer)) {
    return null;
  }

  const providersArray = providersProperty.initializer;
  
  return providersArray.elements.find(el => {
    if (ts.isObjectLiteralExpression(el)) {
      const nameProperty = el.properties.find(p => 
        ts.isPropertyAssignment(p) && 
        ts.isIdentifier(p.name) && 
        p.name.text === 'name'
      ) as ts.PropertyAssignment;
      
      if (nameProperty && ts.isStringLiteral(nameProperty.initializer)) {
        return nameProperty.initializer.text === providerName;
      }
    }
    return false;
  }) as ts.ObjectLiteralExpression || null;
}

/**
 * Get provider config object from provider structure
 */
function getProviderConfigObject(
  providerNode: ts.ObjectLiteralExpression
): ts.ObjectLiteralExpression | null {
  if (!providerNode){
    return null;
  }
  const configProperty = providerNode.properties.find(p => 
    ts.isPropertyAssignment(p) && 
    ts.isIdentifier(p.name) && 
    p.name.text === 'config'
  ) as ts.PropertyAssignment;

  if (!configProperty || !ts.isObjectLiteralExpression(configProperty.initializer)) {
    return null;
  }

  return configProperty.initializer;
}

/**
 * Navigate nested object properties using dot notation
 * Returns the target property assignment or null if not found
 */
function navigateNestedProperty(
  objectNode: ts.ObjectLiteralExpression,
  keyPath: string[]
): { parent: ts.ObjectLiteralExpression; property: ts.PropertyAssignment | null; depth: number } {
  let currentObject = objectNode;
  let targetProperty: ts.PropertyAssignment | undefined;
  let depth = 0;

  for (let i = 0; i < keyPath.length; i++) {
    const key = keyPath[i];
    const isLastKey = i === keyPath.length - 1;

    targetProperty = currentObject.properties.find(p =>
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === key
    ) as ts.PropertyAssignment;

    if (!targetProperty) {
      return { parent: currentObject, property: null, depth: i };
    }

    if (!isLastKey) {
      if (!ts.isObjectLiteralExpression(targetProperty.initializer)) {
        return { parent: currentObject, property: null, depth: i };
      }
      currentObject = targetProperty.initializer;
      depth = i + 1;
    }
  }
  return { parent: currentObject, property: targetProperty || null, depth };
}


export function labelize(str: string): string {
  if (str){
    return strings.dasherize(str).split('-').reduce((previous: string, current: string)=>{
      return (previous !== '' ? previous.concat(' ').concat(strings.capitalize(current)) : previous.concat(strings.capitalize(current)));  
 }, '');
  }
  return '';
}


export function getAnyDecoratorMetadata(
  source: ts.SourceFile,
  identifier: string,
  module: string,
): ts.Node[] {
  const angularImports = findNodes(source as any, ts.SyntaxKind.ImportDeclaration)
    .map((node) => allImportsFromNode(node as any))
    .reduce((acc, current) => {
      for (const key of Object.keys(current)) {
        acc[key] = current[key];
      }

      return acc;
    }, {});

  return getSourceNodes(source)
    .filter((node) => {
      return (
        node.kind == ts.SyntaxKind.Decorator 
        // &&
        // (node as ts.Decorator).expression.kind == ts.SyntaxKind.CallExpression
      );
    })
    .map((node) => (node as ts.Decorator).expression as ts.CallExpression)
    .filter((expr) => {
      if (expr.expression.kind == ts.SyntaxKind.Identifier) {
        const id = expr.expression as ts.Identifier;

        return id.text == identifier && ( (angularImports[id.text] === module) || angularImports[id.text].startsWith(module));
      } else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
        // This covers foo.NgModule when importing * as foo.
        const paExpr = expr.expression as ts.PropertyAccessExpression;
        // If the left expression is not an identifier, just give up at that point.
        if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
          return false;
        }

        const id = paExpr.name.text;
        const moduleId = (paExpr.expression as ts.Identifier).text;

        return id === identifier && angularImports[moduleId + '.'] === module;
      }

      return false;
    })
    .filter(
      (expr) =>
        expr.arguments[0] && expr.arguments[0].kind == ts.SyntaxKind.Identifier,
    )
    .map((expr) => expr.arguments[0] as ts.Identifier);
}

function allImportsFromNode(node: ts.ImportDeclaration): { [name: string]: string } {
  const ms = node.moduleSpecifier;
  let modulePath: string;
  switch (ms.kind) {
    case ts.SyntaxKind.StringLiteral:
      modulePath = (ms as ts.StringLiteral).text;
      break;
    default:
      return {};
  }

  if (node.importClause) {
    if (node.importClause.name) {
      // This is of the form `import Name from 'path'`. Ignore.
      return {};
    } else if (node.importClause.namedBindings) {
      const nb = node.importClause.namedBindings;
      if (nb.kind == ts.SyntaxKind.NamespaceImport) {
        // This is of the form `import * as name from 'path'`. Return `name.`.
        return {
          [nb.name.text + '.']: modulePath,
        };
      } else {
        // This is of the form `import {a,b,c} from 'path'`
        const namedImports = nb;

        return namedImports.elements
          .map((is: ts.ImportSpecifier) => (is.propertyName ? is.propertyName.text : is.name.text))
          .reduce((acc: { [name: string]: string }, curr: string) => {
            acc[curr] = modulePath;

            return acc;
          }, {});
      }
    }

    return {};
  } else {
    // This is of the form `import 'path';`. Nothing to do.
    return {};
  }
}

export function getServiceName(source: ts.SourceFile): string {
  if (!source){
    return '';
  }
  let metaData = getAnyDecoratorMetadata(source, 'AverosEntity', '@averos/ui-platform');
  return metaData.length > 0 ? metaData[0].getText() : '';
}

const BASE_EXCLUDED_PATHS = [
  '/lib/',
  '/.angular/',
  '/coverage/',
  '/out/',
  '/.cache/',
];

function isExcludedPath(filePath: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((excluded) => filePath.includes(excluded));
}

// Utility to find the file implementing a class
export function findClassImplementationFilePath(tree: Tree, className: string, onlyInApplication: boolean = false): string | null {
  let foundPath: string | null = null;
  tree.visit((filePath) => {
    if (isExcludedPath(filePath, BASE_EXCLUDED_PATHS)) {
      return;
    }

    if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) {
      return;
    }

    const isProjectSource = filePath.includes('/src/') && !filePath.includes('/node_modules/');
    const isAllowedLibrary = !onlyInApplication && (filePath.includes('/node_modules/@angular/') ||
                             filePath.includes('/node_modules/@averos/'));

    if (!isProjectSource && !isAllowedLibrary) {
      return;
    }

    const content = tree.read(filePath)?.toString();
    if (content && containsClassDeclaration(content, className)) {
      foundPath = filePath;
    }
  });

  return foundPath;
}

function containsClassDeclaration(content: string, className: string): boolean {
  const suffixes = [' ', '{', ' extends', ' implements'];
  const prefixes = ['class', 'declare class', 'export class', 'export declare class'];

  return prefixes.some(prefix =>
    suffixes.some(suffix =>
      content.includes(`${prefix} ${className}${suffix}`)
    )
  );
}

// Utility to find the JSON view format file related to a given entity class
export function findEntityViewLayoutFilePath(tree: Tree, entityClassName: string): string | null {
  let foundPath: string | null = null;
  const viewLayoutFileName = `${entityClassName.toLocaleLowerCase()}VL.json`;

  const excludedPaths = [...BASE_EXCLUDED_PATHS];
  
  tree.visit((filePath) => {
    const isProjectSource = filePath.includes('/src/') && !filePath.includes('/node_modules/');
    const isAllowedLibrary = filePath.includes('/node_modules/@averos/');

    if (!isProjectSource && !isAllowedLibrary) {
      return;
    }

    // Skip non-source paths early
    if (isExcludedPath(filePath, excludedPaths)) {
      return;
    }

    if (filePath.endsWith(`/${viewLayoutFileName}`)) {
        foundPath = filePath;
    }
  });
  return foundPath;
}

// Utility to find Annotated Class path
export function findAnnotatedClassImplementationFilePath(tree: Tree, className: string, annotation: string): string | null {
  let foundPath: string | null = null;

  const excludedPaths = [...BASE_EXCLUDED_PATHS, '/node_modules/', '/dist/'];

   const declaresAnnotatedClass = (content: string): boolean => {
    if (!content?.includes(`${annotation}(`)) {
      return false;
    }
    return (
      content.includes(`export class ${className} `) ||
      content.includes(`export class ${className}{`) ||
      content.includes(`export class ${className} extends`) ||
      content.includes(`export class ${className} implements`)
    );
  };

  tree.visit((filePath) => {
    if (isExcludedPath(filePath, excludedPaths)) {
      return;
    }
    if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) {
      return;
    }
    
    const content = tree.read(filePath)?.toString();
    if (content && declaresAnnotatedClass(content)) {
      foundPath = filePath;
    }
  });

  return foundPath;
}

export function isNull(object: any): boolean{
  if (object === null
    || object === undefined
    || (object instanceof Array && (object as []).length===0)
    || (typeof object === 'string' && object.trim()==='')
    || (typeof object === 'number' && object === 0)){
  return true;
} else {
  return false;
} 
}

/**
 * Creates a method in the specified class.
 *
 * @param source - The TypeScript source file.
 * @param classFilePath - Path to the file containing the class.
 * @param methodName - Name of the method to create.
 * @param methodReturns - The return type of the method.
 * @returns A Change object representing the addition of the method.
 */
export function createMethodInClass(
  source: ts.SourceFile,
  classFilePath: string,
  methodName: string,
  methodReturns: string
): Change {
  // Find the class declaration
  const classDeclaration = source.statements.find(
    (node): node is ts.ClassDeclaration =>
      ts.isClassDeclaration(node) && !!node.name
  );

  if (!classDeclaration) {
    throw new Error(`Class not found in file: ${classFilePath}`);
  }

  // Check if the method already exists
  const methodExists = classDeclaration.members.some(
    (member) =>
      ts.isMethodDeclaration(member) &&
      member.name.getText() === methodName
  );

  if (methodExists) {
    console.log(`Method '${methodName}' already exists in the class.`);
    return new NoopChange(); // No change needed
  }

  // Find the closing brace of the class
  const classEnd = classDeclaration.getEnd();

  // Create the method string
  const methodImplementation = `\n  ${methodName}(): ${methodReturns} {\n    // TODO: Implement method logic\n    return null as unknown as ${methodReturns};\n  }\n`;

  // Create the InsertChange
  const change = new InsertChange(classFilePath, classEnd - 1, methodImplementation);

  return change;
}


export function addServiceClassToAverosEntityDecorator(
  sourceFile: ts.SourceFile,
  filePath: string,
  className: string,
  classToAdd: string
): ReplaceChange | undefined {
  // Step 1: Find the class declaration by className
  const classDeclaration = sourceFile.statements.find(
    (stmt) => ts.isClassDeclaration(stmt) && stmt.name?.text === className
  ) as ts.ClassDeclaration | undefined;

  if (!classDeclaration) {
    throw new Error(`Class ${className} not found in ${filePath}.`);
  }

  // Step 2: Access decorators from the modifiers array
  const decorators = classDeclaration.modifiers?.filter(
    (modifier) => modifier.kind === ts.SyntaxKind.Decorator
  ) ?? [];

  // Step 3: Find the @Entity decorator
  const entityDecorator = decorators.find((modifier) => {
    if (!ts.isDecorator(modifier)) return false;
    const expr = (modifier as ts.Decorator).expression;
    return ts.isCallExpression(expr) && expr.expression.getText() === 'AverosEntity';
  });

  // Case 1: If no @AverosEntity decorator exists, add it
  if (!entityDecorator) {
    const newDecorator = ts.factory.createDecorator(
      ts.factory.createCallExpression(ts.factory.createIdentifier('AverosEntity'), undefined, [
        ts.factory.createIdentifier(classToAdd),
      ])
    );

    // Find the position where the class declaration starts
    const classStart = classDeclaration.getStart();
    const classEnd = classDeclaration.getEnd();

    // Create the ReplaceChange
    const change = new ReplaceChange(
      filePath,
      classStart,
      '',
      `@AverosEntity(${classToAdd})`
    );

    return change;
  }

  // Case 2: @Entity decorator exists, update it
  const callExpr = (entityDecorator as ts.Decorator).expression as ts.CallExpression;

  let updatedCallExpr: ts.CallExpression;

  // If there are no arguments, add the new class as an argument
  if (callExpr.arguments.length === 0) {
    updatedCallExpr = ts.factory.updateCallExpression(
      callExpr,
      callExpr.expression,
      callExpr.typeArguments,
      [ts.factory.createIdentifier(classToAdd)] // Add new class as the argument
    );
  }
  // If the existing argument is the same, no change is needed
  else if (
    ts.isIdentifier(callExpr.arguments[0]) &&
    callExpr.arguments[0].getText() === classToAdd
  ) {
    return undefined; // No change needed
  }
  // Otherwise, replace the existing argument with the new class
  else if (ts.isIdentifier(callExpr.arguments[0])) {
    updatedCallExpr = ts.factory.updateCallExpression(
      callExpr,
      callExpr.expression,
      callExpr.typeArguments,
      [ts.factory.createIdentifier(classToAdd)] // Replace the argument
    );
  } else {
    throw new Error(`Unexpected argument format in @Entity decorator on class ${className}.`);
  }

  // Find the start position of the decorator and replace the whole decorator
  const decoratorStart = entityDecorator.getStart();
  const decoratorEnd = entityDecorator.getEnd();

  // Create the ReplaceChange
  const change = new ReplaceChange(
    filePath,
    decoratorStart,
    entityDecorator.getText(),
    `@AverosEntity(${classToAdd}) `
  );

  return change;
}

/**
 * Removes the '.ts' extension from a full path name, if it exists.
 *
 * @param path - The full path name, e.g., 'dir1/dir2/file.ts'.
 * @returns The path without the '.ts' extension.
 */
export function removeTsExtension(path: string): string {
  if (path.endsWith('.ts')) {
      return path.slice(0, -3);
  }
  return path;
}

/**
 * Converts a string into a valid TypeScript identifier for class or method.
 * 
 * - If kind is 'class' and the value is a TypeScript primitive, it is returned unchanged.
 * - Replaces forbidden characters with underscores (_).
 * - Reserved TypeScript/JS keywords are prefixed with an underscore.
 * - Prevents identifiers from starting with a digit.
 * - Applies naming convention based on kind: 'method' (aka member) (camelCase) or 'class' (PascalCase).
 * 
 * @param str - The input string to convert.
 * @param kind - The type of identifier: 'method' or 'class'. Default is 'method'.
 * @returns A valid TypeScript identifier name.
 */
export function toValidIdentifier(str: string, kind: "method" | "class" = "method"): string {
  if (!str) throw new Error(`Invalid ${kind} identifier`);

  const reservedWords = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "as", "implements", "interface", "let", "package", "private", "protected", "public",
    "static", "yield", "any", "boolean", "constructor", "declare", "get", "module",
    "require", "number", "set", "string", "symbol", "type", "from", "of",
    "_entityViewLayout$", "_entityViewLayout", "_entityName", "_instance", 
    "_entityId", "_entityCreatedAt", "_entityUpdatedAt", "_entityLogicalName", 
    "getEntityViewLayout", "getUseCaseViewLayout", "instanceMetadata"
  ]);

  const tsPrimitives = new Set([
    "string", "number", "boolean", "object", "symbol", "any", "unknown", "never", "void", "null", "undefined", "bigint"
  ]);

  // Return as-is if it's a TS primitive and we're generating a class identifier
  if (kind === "class" && tsPrimitives.has(str)) {
    return str;
  }

  // Replace forbidden characters with underscores
  let safeStr = str.replace(/[^a-zA-Z0-9$_]/g, "_");

  // Prevent starting with a digit
  if (/^[0-9]/.test(safeStr)) {
    safeStr = "_" + safeStr;
  }

  // Adjust casing based on kind
  if (kind === "method") {
    // camelCase: lowercase first letter
    safeStr = safeStr.charAt(0).toLowerCase() + safeStr.slice(1);
  } else if (kind === "class") {
    // PascalCase: uppercase first letter
    safeStr = safeStr.charAt(0).toUpperCase() + safeStr.slice(1);
  }

  // Handle reserved keywords
  if (reservedWords.has(safeStr)) {
    safeStr = `_${safeStr}`;
  }

  return safeStr;
}

/**
 * Classifies a string like strings.classify() but preserves
 * underscore-digit suffixes (e.g. _0, _1, _123).
 *
 * Examples:
 *   myEntity_0   → MyEntity_0
 *   myentity_0   → Myentity_0
 *   MyEntity_0   → MyEntity_0
 *   my_entity_0  → MyEntity_0
 *   myEntity     → MyEntity      (standard classify, no suffix)
 */
export function classifyPreserveTrailingIndex(value: string): string {
  // Extract trailing underscore-digit suffix (e.g. _0, _42)
  const suffixMatch = value.match(/(_\d+)+$/);
  const suffix = suffixMatch ? suffixMatch[0] : '';

  // Strip the suffix before classifying
  const base = suffix ? value.slice(0, -suffix.length) : value;

  // Apply standard classify to the base
  const classified = strings.classify(base);

  return `${classified}${suffix}`;
}

export interface ApplicationNavigationItem {
  loggedSpace?: boolean;
  disabled?: boolean;
  displayName?: string;
  translationID?: string;
  iconName?: string;
  route?: string;
  type?: 'link' | 'sub' | 'extLink' | 'extTabLink';
  label?: NavigationItemTag;
  badge?: NavigationItemTag;
  children?: ApplicationNavigationItem[];

}

export interface NavigationItemTag {
  color: string; // Background Color
  value: string;
  translationID: string;
}

export interface ApplicationMenu {
  sideMenu: ApplicationNavigationItem[];
  topMenu: ApplicationNavigationItem[];
}

export const AVEROS_DEFAULT_AVATARS: any = {

    "default_avatar": `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" version="1"><circle style="opacity:0.2;fill:#00100f" cx="16" cy="17" r="14"/><circle style="fill:#5294E2" cx="16" cy="16" r="14"/><g style="opacity:0.2" transform="translate(0,1)"><path d="m 16,6 c -2.2096,0 -4,1.7912 -4,4 0,2.2088 1.7904,4 4,4 2.2096,0 4,-1.7912 4,-4 0,-2.2088 -1.7904,-4 -4,-4 z"/><path d="m 16,16.000001 c -6.9993,0.0042 -7,4.430769 -7,4.430769 v 1.8 c 0,0 1.292299,2.76923 7,2.76923 5.707701,0 7,-2.76923 7,-2.76923 v -1.8 c 0,0 0,-4.433538 -6.9986,-4.430769 z"/></g><g><path style="fill:#ffffff" d="m 16,6 c -2.2096,0 -4,1.7912 -4,4 0,2.2088 1.7904,4 4,4 2.2096,0 4,-1.7912 4,-4 0,-2.2088 -1.7904,-4 -4,-4 z"/><path style="fill:#ffffff" d="m 16,16.000001 c -6.9993,0.0042 -7,4.430769 -7,4.430769 v 1.8 c 0,0 1.292299,2.76923 7,2.76923 5.707701,0 7,-2.76923 7,-2.76923 v -1.8 c 0,0 0,-4.433538 -6.9986,-4.430769 z"/></g><path style="fill:#ffffff;opacity:0.2" d="M 16 2 A 14 14 0 0 0 2 16 A 14 14 0 0 0 2.0214844 16.585938 A 14 14 0 0 1 16 3 A 14 14 0 0 1 29.978516 16.414062 A 14 14 0 0 0 30 16 A 14 14 0 0 0 16 2 z"/></svg>`,
    "avatar-girl": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#4bc190;}.cls-2{fill:#356cb6;opacity:0.3;}.cls-3{fill:#393c54;}.cls-4{fill:#f85565;}.cls-5{fill:#fbc0aa;}.cls-6{fill:#f8dc25;}.cls-7{fill:#f2bc0f;}.cls-8{fill:#fff;}.cls-11,.cls-13,.cls-14,.cls-15,.cls-9{fill:none;stroke-linecap:round;}.cls-14,.cls-9{stroke:#fbc0aa;}.cls-13,.cls-14,.cls-15,.cls-9{stroke-linejoin:round;}.cls-9{stroke-width:12px;}.cls-10{fill:#ffd8c9;}.cls-11{stroke:#fff;stroke-miterlimit:10;stroke-width:3.68px;opacity:0.1;}.cls-12{fill:#515570;}.cls-13,.cls-15{stroke:#515570;stroke-width:2px;}.cls-14{stroke-width:4.71px;}.cls-15{opacity:0.2;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><path class="cls-3" d="M99,82a4,4,0,0,1-4-4V34h0a13,13,0,0,0-25.9,0h0l6,48a12,12,0,0,0,24,0Z"/><circle class="cls-4" cx="75" cy="36" r="10"/><path class="cls-3" d="M63,28h0A29.41,29.41,0,0,1,92.41,57.41v6.12A10.94,10.94,0,0,1,81.47,74.47H44.53A10.94,10.94,0,0,1,33.59,63.53V57.41A29.41,29.41,0,0,1,63,28Z"/><circle class="cls-5" cx="85.98" cy="74.31" r="6.43"/><path class="cls-6" d="M64,124a59.62,59.62,0,0,0,33-9.92l-2.66-7.44A10,10,0,0,0,85,100H41.05a10,10,0,0,0-9.42,6.64L29.36,113A59.74,59.74,0,0,0,64,124Z"/><path class="cls-7" d="M82.92,100H43.08a20,20,0,0,0,39.84,0Z"/><path class="cls-8" d="M72,101.25a9,9,0,0,1-18,0c0-5,4-3,9-3S72,96.28,72,101.25Z"/><line class="cls-9" x1="63" x2="63" y1="87.75" y2="101.5"/><circle class="cls-5" cx="40.02" cy="74.31" r="6.43"/><path class="cls-10" d="M63,98.84a23,23,0,0,1-23-23V60.76a23,23,0,0,1,46,0V75.87A23,23,0,0,1,63,98.84Z"/><path class="cls-11" d="M44.82,51A19.9,19.9,0,0,1,62.4,38.54"/><path class="cls-12" d="M88.82,58.82A25.82,25.82,0,0,0,62.27,33c-14.06.39-25.09,12.28-25.09,26.35v4a4.83,4.83,0,0,0,1.48,3.51,5.93,5.93,0,0,0,1.36,1V64a4,4,0,0,1,4-4h5.38a1,1,0,0,0,.9-.55L52,56l1.72,3.45a1,1,0,0,0,.9.55H82a4,4,0,0,1,4,4v3.89a5.93,5.93,0,0,0,1.36-1,4.83,4.83,0,0,0,1.48-3.51Z"/><path class="cls-13" d="M70.67,75.28a3,3,0,0,1,6,0"/><line class="cls-14" x1="62.5" x2="62.5" y1="77.5" y2="81.5"/><line class="cls-15" x1="72" x2="79" y1="68" y2="68"/><path class="cls-13" d="M55,75.28a3,3,0,0,0-6,0"/><line class="cls-15" x1="54" x2="47" y1="68" y2="68"/><path class="cls-3" d="M70.55,86a1,1,0,0,1,.94,1.07,8.56,8.56,0,0,1-17,0A1,1,0,0,1,55.45,86Z"/><path class="cls-4" d="M58,92.91a8.52,8.52,0,0,0,10.08,0C67,91.16,65.17,91,63,91S59,91.16,58,92.91Z"/><path class="cls-8" d="M68,88H58a1.84,1.84,0,0,1-1.73-2H69.77A1.84,1.84,0,0,1,68,88Z"/></svg>`,
	  "avatar-woman": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#00adfe;}.cls-2{fill:#356cb6;opacity:0.3;}.cls-3{fill:#393c54;}.cls-4{fill:#fbc0aa;}.cls-13,.cls-5{fill:#f85565;}.cls-6{fill:#fff;}.cls-10,.cls-11,.cls-12,.cls-14,.cls-15,.cls-7{fill:none;stroke-linecap:round;}.cls-12,.cls-7{stroke:#fbc0aa;}.cls-11,.cls-12,.cls-14,.cls-15,.cls-7{stroke-linejoin:round;}.cls-7{stroke-width:14px;}.cls-8{fill:#ffd8c9;}.cls-9{fill:#515570;}.cls-10{stroke:#fff;stroke-miterlimit:10;stroke-width:4px;opacity:0.1;}.cls-11,.cls-15{stroke:#515570;}.cls-11,.cls-14,.cls-15{stroke-width:2px;}.cls-12{stroke-width:5px;}.cls-13{opacity:0.5;}.cls-14{stroke:#f85565;}.cls-15{opacity:0.2;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><path class="cls-3" d="M64,13.88h0a32,32,0,0,1,32,32v64.79a0,0,0,0,1,0,0H32a0,0,0,0,1,0,0V45.88a32,32,0,0,1,32-32Z"/><circle class="cls-4" cx="89" cy="61" r="7"/><path class="cls-5" d="M64,124a59.67,59.67,0,0,0,34.69-11.06l-3.32-9.3A10,10,0,0,0,86,97H42.05a10,10,0,0,0-9.42,6.64l-3.32,9.3A59.67,59.67,0,0,0,64,124Z"/><path class="cls-6" d="M73,98.25a9,9,0,0,1-18,0c0-5,4-3,9-3S73,93.28,73,98.25Z"/><line class="cls-7" x1="64" x2="64" y1="84.75" y2="98.5"/><circle class="cls-4" cx="39" cy="61" r="7"/><path class="cls-8" d="M64,91A25,25,0,0,1,39,66V49.52a25,25,0,1,1,50,0V66A25,25,0,0,1,64,91Z"/><path class="cls-9" d="M36.51,52.12V47.4c0-14.95,11.71-27.61,26.66-28A27.51,27.51,0,0,1,91.49,46.82v-.24a2,2,0,0,1-2,2H80.12a1.82,1.82,0,0,1-1.55-.87l-2.33-3.8a1.82,1.82,0,0,0-3.24.27L69.89,53a1.83,1.83,0,0,1-1.69,1.14H38.55A2,2,0,0,1,36.51,52.12Z"/><path class="cls-10" d="M44.22,38.85A21.67,21.67,0,0,1,63.35,25.34"/><circle class="cls-9" cx="74.67" cy="59.28" r="3"/><line class="cls-11" x1="55" x2="49" y1="60" y2="60"/><line class="cls-12" x1="63.35" x2="63.35" y1="63.75" y2="68.25"/><path class="cls-13" d="M69.15,78.94c0,2-2.3,3.16-5.15,3.16s-5.15-1.52-5.15-3.16c0-2.84,2.48-3.94,5.15-3.15C66.58,74.92,69.15,76.1,69.15,78.94Z"/><path class="cls-14" d="M58,77.87a16.83,16.83,0,0,0,12,0"/><line class="cls-15" x1="72.39" x2="81" y1="53" y2="53"/></svg>`,
    "avatar-woman-2": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#a7aece;}.cls-2{fill:#515570;opacity:0.2;}.cls-3{fill:#393c54;}.cls-4{fill:#8f5653;}.cls-5{fill:#ff8475;}.cls-6{fill:#fff;}.cls-11,.cls-7,.cls-9{fill:none;stroke-linecap:round;}.cls-7{stroke:#8f5653;stroke-width:16px;}.cls-11,.cls-7{stroke-miterlimit:10;}.cls-8{fill:#b56b63;}.cls-11,.cls-9{stroke:#515570;}.cls-9{stroke-linejoin:round;stroke-width:1.89px;opacity:0.4;}.cls-10{fill:#f85565;}.cls-11{stroke-width:2px;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><path class="cls-3" d="M99.72,51.16a4.33,4.33,0,0,0-1.15-8.5,4.33,4.33,0,0,0-3.14-8,4.33,4.33,0,0,0-5-7A4.33,4.33,0,0,0,84,22.06a4.33,4.33,0,0,0-7.64-3.91,4.33,4.33,0,0,0-8.35-2,4.33,4.33,0,0,0-8.58.13l-.72.09a4.34,4.34,0,0,0-8.29,2.25,4.34,4.34,0,0,0-7.48,4.21,4.33,4.33,0,0,0-6.26,5.86A4.33,4.33,0,0,0,32,35.91,4.33,4.33,0,0,0,29.14,44a4.33,4.33,0,0,0-.82,8.54A4.33,4.33,0,0,0,29.56,61,4.33,4.33,0,0,0,32.79,69a4.33,4.33,0,0,0,5,7,4.33,4.33,0,0,0,6.55,5.54,4.33,4.33,0,0,0,7.68,3.83,4.33,4.33,0,0,0,8.37,1.88A4.33,4.33,0,0,0,69,87a4.33,4.33,0,0,0,8.29-2.21,4.33,4.33,0,0,0,7.52-4.12,4.34,4.34,0,0,0,6.33-5.8,4.33,4.33,0,0,0,4.76-7.14,4.33,4.33,0,0,0,2.91-8.07,4.33,4.33,0,0,0,.91-8.53Z"/><circle class="cls-4" cx="89.84" cy="70.87" r="7.5"/><path class="cls-5" d="M64,124a59.75,59.75,0,0,0,37.53-13.2l-2-5.53C98,101.5,93.68,99,88.89,99H39.11c-4.79,0-9.07,2.51-10.68,6.28l-2,5.53A59.75,59.75,0,0,0,64,124Z"/><path class="cls-6" d="M74.26,100.86c0,5.66-4.6,9.25-10.26,9.25s-10.26-3.59-10.26-9.25,4.6-3.42,10.26-3.42S74.26,95.19,74.26,100.86Z"/><line class="cls-7" x1="64" x2="64" y1="88.88" y2="98.88"/><circle class="cls-4" cx="38.16" cy="70.87" r="7.5"/><path class="cls-8" d="M64,98A26.78,26.78,0,0,1,37.21,71.19V61.57a26.79,26.79,0,0,1,53.58,0v9.62A26.78,26.78,0,0,1,64,98Z"/><path class="cls-3" d="M63.15,30.12C47.92,30.57,36,43.47,36,58.7a2,2,0,0,0,2,2h0A2.72,2.72,0,0,0,40.6,58.6h0A9.28,9.28,0,0,1,49.73,51H78.27a9.28,9.28,0,0,1,9.13,7.6h0A2.72,2.72,0,0,0,90,60.66h0a2,2,0,0,0,2-2v-.6A28,28,0,0,0,63.15,30.12Z"/><line class="cls-9" x1="74.12" x2="83.21" y1="63.84" y2="63.6"/><line class="cls-9" x1="53.88" x2="44.79" y1="63.84" y2="63.6"/><path class="cls-3" d="M71.55,84a1,1,0,0,1,.94,1.07,8.56,8.56,0,0,1-17,0A1,1,0,0,1,56.45,84Z"/><path class="cls-10" d="M59,90.91a8.52,8.52,0,0,0,10.08,0C68,89.16,66.17,89,64,89S60,89.16,59,90.91Z"/><path class="cls-6" d="M69,86H59a1.84,1.84,0,0,1-1.73-2H70.77A1.84,1.84,0,0,1,69,86Z"/><rect class="cls-3" height="3" width="2" x="60" y="84"/><path class="cls-4" d="M63.39,72.24l-3.25,7.44a.69.69,0,0,0,.64,1h6.49a.69.69,0,0,0,.64-1l-3.25-7.44A.7.7,0,0,0,63.39,72.24Z"/><path class="cls-11" d="M54,72a3,3,0,0,0-6,0"/><path class="cls-11" d="M80,72a3,3,0,0,0-6,0"/></svg>`,
    "avatar-woman-3": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1,.cls-11{fill:#f85565;}.cls-14,.cls-2{fill:#fff;}.cls-10,.cls-11,.cls-2{opacity:0.2;}.cls-3{fill:#f2bc0f;}.cls-4{fill:#fba875;}.cls-5{fill:#ffbb94;}.cls-10,.cls-13,.cls-6,.cls-8,.cls-9{fill:none;stroke-linecap:round;}.cls-6,.cls-9{stroke:#fba875;}.cls-13,.cls-6,.cls-9{stroke-miterlimit:10;}.cls-6{stroke-width:14px;}.cls-7{fill:#515570;}.cls-10,.cls-8{stroke:#515570;stroke-linejoin:round;}.cls-13,.cls-9{stroke-width:3px;}.cls-10{stroke-width:2px;}.cls-12{fill:#f8dc25;}.cls-13{stroke:#f2bc0f;opacity:0.3;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><circle class="cls-3" cx="89" cy="60" r="15"/><circle class="cls-3" cx="82" cy="77" r="10"/><circle class="cls-3" cx="39" cy="60" r="15"/><circle class="cls-3" cx="46" cy="77" r="10"/><path class="cls-3" d="M64,14.88h0a32,32,0,0,1,32,32v4.71A21.59,21.59,0,0,1,74.41,73.17H53.59A21.59,21.59,0,0,1,32,51.59V46.88a32,32,0,0,1,32-32Z"/><circle class="cls-4" cx="89" cy="60" r="7"/><path class="cls-5" d="M64,124a59.69,59.69,0,0,0,32.55-9.61l-3.18-10.75A10,10,0,0,0,84,97H44.05a10,10,0,0,0-9.42,6.64l-3.18,10.75A59.69,59.69,0,0,0,64,124Z"/><line class="cls-6" x1="64" x2="64" y1="88.75" y2="96.5"/><circle class="cls-4" cx="39" cy="60" r="7"/><path class="cls-5" d="M64,90A25,25,0,0,1,39,65V47.52a25,25,0,1,1,50,0V65A25,25,0,0,1,64,90Z"/><circle class="cls-7" cx="76" cy="58.28" r="3"/><path class="cls-8" d="M70.5,59.37A6.61,6.61,0,0,1,82,58.06"/><circle class="cls-7" cx="52" cy="58.28" r="3"/><path class="cls-9" d="M61.75,69a5.29,5.29,0,0,0,4.5,0"/><line class="cls-10" x1="55" x2="45.75" y1="52" y2="52"/><circle class="cls-11" cx="51" cy="67" r="5.08"/><path class="cls-12" d="M36.51,58.15V47.4c0-14.95,11.71-27.61,26.66-28A27.51,27.51,0,0,1,91.49,46.82v-.24a2,2,0,0,1-2,2h0a7.11,7.11,0,0,1-6.31-3.85L77.58,33.92l-7.4,13.73a31.43,31.43,0,0,1-27.67,16.5h0A6,6,0,0,1,36.51,58.15Z"/><circle class="cls-12" cx="41.61" cy="49.55" r="14.61"/><circle class="cls-12" cx="44" cy="33.94" r="7.64"/><path class="cls-13" d="M70.22,34.94,64.9,44.8A25.41,25.41,0,0,1,42.59,58.15h0c-5.28,0-9.59-3.89-9.59-8.6"/><circle class="cls-12" cx="89.81" cy="41.13" r="7.64"/><circle class="cls-11" cx="77" cy="67" r="5.08"/><circle class="cls-7" cx="74.5" cy="71.5" r="1"/><path class="cls-14" d="M83.32,120.9,76,96.5H74l-8.76,27.57A59.72,59.72,0,0,0,83.32,120.9Z"/><path class="cls-14" d="M61.52,124,54,96.5H52l-7.32,24.4A59.66,59.66,0,0,0,61.52,124Z"/><path class="cls-1" d="M71.12,78.48a.49.49,0,0,0-.19-.7c-.71-.39-2-1.08-2.75-1.61a2.51,2.51,0,0,0-2.76,0h0a2.42,2.42,0,0,1-2.84,0h0a2.51,2.51,0,0,0-2.76,0c-.78.51-2,1.18-2.69,1.58a.49.49,0,0,0-.17.72c.77,1.11,2,4.35,6.82,4.47h.44C69,82.8,70.41,79.61,71.12,78.48Z"/><path class="cls-14" d="M61,78.85h6s-.6,1.3-3,1.3S61,78.85,61,78.85Z"/><circle class="cls-14" cx="90" cy="68" r="3"/><circle class="cls-14" cx="38" cy="68" r="3"/><path class="cls-10" d="M72,51l5.18-2.36a4.6,4.6,0,0,1,4.67.5L83,50"/></svg>`,
    "avatar-woman-4": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#ff8475;}.cls-13,.cls-2{fill:#f85565;}.cls-2{opacity:0.4;}.cls-3{fill:#fff;}.cls-4,.cls-7{fill:#356cb6;}.cls-17,.cls-4{opacity:0.1;}.cls-5{fill:#fbc0aa;}.cls-15,.cls-6{fill:#00adfe;}.cls-10,.cls-11,.cls-12,.cls-14,.cls-16,.cls-17,.cls-8{fill:none;stroke-linecap:round;}.cls-11,.cls-8{stroke:#fbc0aa;}.cls-11,.cls-12,.cls-14,.cls-16,.cls-17,.cls-8{stroke-linejoin:round;}.cls-8{stroke-width:14px;}.cls-9{fill:#ffd8c9;}.cls-10{stroke:#fff;stroke-miterlimit:10;}.cls-10,.cls-12,.cls-17{stroke-width:2px;}.cls-11{stroke-width:5px;}.cls-12,.cls-14,.cls-16,.cls-17{stroke:#515570;}.cls-12,.cls-15{opacity:0.2;}.cls-14,.cls-16{stroke-width:2.33px;}.cls-14{opacity:0.7;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><circle class="cls-3" cx="64" cy="25" r="14.92"/><circle class="cls-4" cx="64" cy="25" r="14.92"/><path class="cls-3" d="M64,19.4h0A30.33,30.33,0,0,1,94.33,49.73v4.46A20.46,20.46,0,0,1,73.87,74.65H54.13A20.46,20.46,0,0,1,33.67,54.19V49.73A30.33,30.33,0,0,1,64,19.4Z"/><circle class="cls-5" cx="89" cy="65" r="7"/><path class="cls-6" d="M64,124a59.7,59.7,0,0,0,34.7-11.07l-3.33-10.29A10,10,0,0,0,86,96H42.05a10,10,0,0,0-9.42,6.64L29.3,112.93A59.7,59.7,0,0,0,64,124Z"/><path class="cls-7" d="M46.54,121.41a60.15,60.15,0,0,0,34.92,0L79,96H49Z"/><circle class="cls-3" cx="56" cy="98" r="3"/><circle class="cls-3" cx="57" cy="102" r="3"/><circle class="cls-3" cx="72" cy="98" r="3"/><circle class="cls-3" cx="71" cy="102" r="3"/><circle class="cls-3" cx="60" cy="105" r="3"/><circle class="cls-3" cx="64" cy="106" r="3"/><circle class="cls-3" cx="68" cy="105" r="3"/><line class="cls-8" x1="64" x2="64" y1="88" y2="98"/><circle class="cls-5" cx="39" cy="65" r="7"/><path class="cls-9" d="M64,95A25,25,0,0,1,39,70V53.52a25,25,0,1,1,50,0V70A25,25,0,0,1,64,95Z"/><path class="cls-3" d="M91.49,53.12V51.4c0-14.95-11.71-27.61-26.66-28A27.51,27.51,0,0,0,36.51,50.82v-.24a2,2,0,0,0,2,2h9.87a9.79,9.79,0,0,0,8.34-4.67h0c2,4.15,6.05,6,8.41,6.75a10,10,0,0,0,3,.46H89.45A2,2,0,0,0,91.49,53.12Z"/><path class="cls-4" d="M91.49,53.12V51.4c0-14.95-11.71-27.61-26.66-28A27.51,27.51,0,0,0,36.51,50.82v-.24a2,2,0,0,0,2,2h9.87a9.79,9.79,0,0,0,8.34-4.67h0c2,4.15,6.05,6,8.41,6.75a10,10,0,0,0,3,.46H89.45A2,2,0,0,0,91.49,53.12Z"/><path class="cls-10" d="M63,43c2.52,5.22,6.39,6.09,9.6,6.09h12"/><line class="cls-11" x1="64" x2="64" y1="69.75" y2="76.25"/><line class="cls-12" x1="53.63" x2="44.38" y1="57" y2="57"/><line class="cls-12" x1="83.63" x2="74.38" y1="57" y2="57"/><path class="cls-13" d="M64,86c5,0,7-3,7-3H57S59,86,64,86Z"/><line class="cls-14" x1="74" x2="78" y1="68" y2="68"/><line class="cls-14" x1="50" x2="54" y1="68" y2="68"/><circle class="cls-15" cx="52" cy="65" r="7"/><circle class="cls-16" cx="52" cy="65" r="7"/><circle class="cls-15" cx="76" cy="65" r="7"/><circle class="cls-16" cx="76" cy="65" r="7"/><line class="cls-16" x1="59" x2="69" y1="65" y2="65"/><line class="cls-17" x1="52" x2="57" y1="84" y2="77"/><line class="cls-17" x1="75" x2="70" y1="84" y2="77"/></svg>`,
    "avatar-man": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#4bc190;}.cls-13,.cls-2{fill:#356cb6;}.cls-2{opacity:0.3;}.cls-3{fill:#393c54;}.cls-4{fill:#fba875;}.cls-5{fill:#fff;}.cls-12,.cls-6,.cls-8,.cls-9{fill:none;stroke-linecap:round;}.cls-6,.cls-9{stroke:#fba875;}.cls-12,.cls-6,.cls-9{stroke-miterlimit:10;}.cls-6{stroke-width:20px;}.cls-7{fill:#ffbb94;}.cls-8{stroke:#515570;stroke-linejoin:round;stroke-width:2px;opacity:0.4;}.cls-9{stroke-width:4px;}.cls-10{fill:#f85565;}.cls-11{fill:#515570;}.cls-12{stroke:#fff;stroke-width:3.28px;}.cls-12,.cls-13{opacity:0.1;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><path class="cls-3" d="M31.08,61.57V45.92a32.92,32.92,0,0,1,65.84,0V61.57Z"/><circle class="cls-4" cx="91.32" cy="60.43" r="7.93"/><path class="cls-5" d="M64,124.1a59.78,59.78,0,0,0,40-15.28l-2.39-5.68c-1.71-4-6.22-6.64-11.29-6.64H37.69c-5.07,0-9.58,2.66-11.29,6.64L24,108.82A59.78,59.78,0,0,0,64,124.1Z"/><path class="cls-5" d="M81.72,98.25a3.06,3.06,0,0,0-3.08-2.88H49.36a3.07,3.07,0,0,0-3.08,2.93c0,.11,0,.21,0,.32-.17,7.32,10.52,16.64,10.52,16.64L64,108.05l7.17,7.17s10.56-9,10.56-16.22C81.73,98.74,81.73,98.49,81.72,98.25Z"/><line class="cls-6" x1="64" x2="64" y1="84.75" y2="98.5"/><circle class="cls-4" cx="36.68" cy="60.43" r="7.93"/><path class="cls-7" d="M64,94.37A28.31,28.31,0,0,1,35.68,66.05V47.43a28.32,28.32,0,1,1,56.64,0V66.05A28.31,28.31,0,0,1,64,94.37Z"/><circle class="cls-3" cx="76.67" cy="59.28" r="3"/><circle class="cls-3" cx="49.67" cy="59.28" r="3"/><line class="cls-8" x1="74.39" x2="84" y1="53" y2="52.75"/><line class="cls-8" x1="53" x2="43.39" y1="53" y2="52.75"/><path class="cls-3" d="M71.55,74a1,1,0,0,1,.94,1.07,8.56,8.56,0,0,1-17,0A1,1,0,0,1,56.45,74Z"/><line class="cls-8" x1="60" x2="68" y1="86" y2="86"/><line class="cls-9" x1="63.35" x2="63.35" y1="60.75" y2="67.25"/><line class="cls-9" x1="66" x2="61" y1="68" y2="68"/><path class="cls-10" d="M59,80.91a8.52,8.52,0,0,0,10.08,0,5.79,5.79,0,0,0-10.08,0Z"/><path class="cls-5" d="M69,76H59a1.84,1.84,0,0,1-1.73-2H70.77A1.84,1.84,0,0,1,69,76Z"/><path class="cls-11" d="M64,16.85a30,30,0,0,0-30,30V53a4,4,0,0,0,4-4V41.56a4.18,4.18,0,0,1,4.18-4.18h7.36A20.61,20.61,0,0,0,64,42.77a20.61,20.61,0,0,0,14.41-5.39h7.36A4.18,4.18,0,0,1,90,41.56v7.35a4,4,0,0,0,4,4V46.84A30,30,0,0,0,64,16.85Z"/><path class="cls-3" d="M60.16,123.86c1.27.08,2.55.14,3.84.14s2.57-.06,3.84-.14L67,115H61Z"/><path class="cls-12" d="M52.19,31.87A16.93,16.93,0,0,0,64,36.29a16.93,16.93,0,0,0,11.81-4.42h7.58"/><path class="cls-11" d="M64.58,117.22H63.26a4.58,4.58,0,0,1-4.58-4.58V108H69.17v4.64A4.58,4.58,0,0,1,64.58,117.22Z"/><polygon class="cls-5" points="64 108 74.17 95.38 78.64 95.38 71.17 115.22 64 108"/><polygon class="cls-5" points="64 108 53.83 95.38 49.36 95.38 56.83 115.22 64 108"/><path class="cls-13" d="M81.72,98.25a3.06,3.06,0,0,0-3.08-2.88H74.17L64,108,53.83,95.37H49.36a3.06,3.06,0,0,0-3.08,2.92c0,.11,0,.21,0,.32-.17,7.32,10.52,16.64,10.52,16.64L64,108.05l7.17,7.17s10.56-9,10.56-16.22C81.73,98.74,81.73,98.49,81.72,98.25Z"/></svg>`,
    "avatar-man-2": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#00adfe;}.cls-2,.cls-6{fill:#fff;}.cls-14,.cls-2{opacity:0.3;}.cls-3{fill:#393c54;}.cls-4{fill:#fba875;}.cls-5{fill:#b56b63;}.cls-10,.cls-11,.cls-13,.cls-14,.cls-7,.cls-9{fill:none;stroke-linecap:round;}.cls-10,.cls-7{stroke:#fba875;}.cls-10,.cls-11,.cls-13,.cls-7{stroke-miterlimit:10;}.cls-7{stroke-width:20px;}.cls-8{fill:#ffbb94;}.cls-9{stroke:#515570;opacity:0.4;}.cls-14,.cls-9{stroke-linejoin:round;stroke-width:2px;}.cls-10,.cls-11,.cls-13{stroke-width:4px;}.cls-11{stroke:#393c54;}.cls-12{fill:#515570;}.cls-13{stroke:#fff;}.cls-13,.cls-15{opacity:0.1;}.cls-14{stroke:#f85565;}.cls-15{fill:#f85565;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><path class="cls-3" d="M31.08,61.57V45.92a32.92,32.92,0,0,1,65.84,0V61.57Z"/><circle class="cls-4" cx="91.32" cy="60.43" r="7.93"/><path class="cls-5" d="M64,124.1a59.78,59.78,0,0,0,40-15.28l-2.39-5.68c-1.71-4-6.22-6.64-11.29-6.64H37.69c-5.07,0-9.58,2.66-11.29,6.64L24,108.82A59.78,59.78,0,0,0,64,124.1Z"/><path class="cls-6" d="M81.72,98.25a3.06,3.06,0,0,0-3.08-2.88H49.36a3.07,3.07,0,0,0-3.08,2.93c0,.11,0,.21,0,.32-.17,7.32,10.52,16.64,10.52,16.64L64,108.05l7.17,7.17s10.56-9,10.56-16.22C81.73,98.74,81.73,98.49,81.72,98.25Z"/><line class="cls-7" x1="64" x2="64" y1="84.75" y2="98.5"/><circle class="cls-4" cx="36.68" cy="60.43" r="7.93"/><path class="cls-8" d="M64,94.37A28.31,28.31,0,0,1,35.68,66.05V47.43a28.32,28.32,0,1,1,56.64,0V66.05A28.31,28.31,0,0,1,64,94.37Z"/><circle class="cls-3" cx="77.5" cy="59.28" r="3"/><circle class="cls-3" cx="50.5" cy="59.28" r="3"/><line class="cls-9" x1="74.69" x2="84.31" y1="53" y2="52.75"/><line class="cls-9" x1="53.31" x2="43.69" y1="53" y2="52.75"/><path class="cls-3" d="M92.32,64.81h-1.1A3.22,3.22,0,0,0,88,68h0a3.22,3.22,0,0,1-3.22,3.22H43.22A3.22,3.22,0,0,1,40,68h0a3.22,3.22,0,0,0-3.22-3.22h-1.1V82.28c0,15.43,12.1,28.47,27.52,28.9A28.32,28.32,0,0,0,92.32,82.87Z"/><path class="cls-6" d="M71.55,75a1,1,0,0,1,.94,1.07,8.56,8.56,0,0,1-17,0A1,1,0,0,1,56.45,75Z"/><line class="cls-10" x1="64" x2="64" y1="60.75" y2="67.25"/><line class="cls-10" x1="66.5" x2="61.5" y1="68" y2="68"/><line class="cls-11" x1="36" x2="36" y1="56" y2="36"/><line class="cls-11" x1="92" x2="92" y1="56" y2="35"/><path class="cls-12" d="M31,23.83A15.17,15.17,0,0,0,46.17,39H91.5a1,1,0,0,0,1-1.29A29.92,29.92,0,0,0,64,17H31Z"/><path class="cls-13" d="M70.5,33H47.73a10,10,0,0,1-10-10"/><line class="cls-14" x1="65" x2="67" y1="67" y2="67"/><ellipse class="cls-15" cx="50.42" cy="67.67" rx="4.58" ry="2.98"/><ellipse class="cls-15" cx="77.58" cy="67.67" rx="4.58" ry="2.98"/></svg>`,
    "avatar-man-3": `<?xml version="1.0" ?><svg data-name="Layer 1" id="Layer_1" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:#4bc190;}.cls-12,.cls-2{fill:#356cb6;}.cls-2{opacity:0.3;}.cls-3{fill:#fff;}.cls-4{fill:#fbc0aa;}.cls-5{fill:#515570;}.cls-10,.cls-6{fill:none;stroke:#fbc0aa;stroke-linecap:round;stroke-linejoin:round;}.cls-6{stroke-width:20px;}.cls-7,.cls-8{fill:#393c54;}.cls-12,.cls-8{opacity:0.1;}.cls-9{fill:#ffd8c9;}.cls-10{stroke-width:2px;}.cls-11{fill:#f85565;}</style></defs><title/><circle class="cls-1" cx="64" cy="64" r="60"/><circle class="cls-2" cx="64" cy="64" r="48"/><circle class="cls-3" cx="30.76" cy="59.37" r="10"/><circle class="cls-3" cx="97.24" cy="59.37" r="10"/><circle class="cls-3" cx="32.76" cy="41.77" r="12.43"/><circle class="cls-3" cx="95.24" cy="41.77" r="12.43"/><circle class="cls-3" cx="44.5" cy="25.34" r="12.43"/><circle class="cls-3" cx="83.5" cy="25.34" r="12.43"/><circle class="cls-4" cx="91.32" cy="64.43" r="7.93"/><path class="cls-3" d="M64,124.1a59.78,59.78,0,0,0,40-15.28l-2.39-5.68c-1.71-4-6.22-6.64-11.29-6.64H37.69c-5.07,0-9.58,2.66-11.29,6.64L24,108.82A59.78,59.78,0,0,0,64,124.1Z"/><path class="cls-5" d="M79,96.5H48.85A15.07,15.07,0,0,0,79,96.5Z"/><line class="cls-6" x1="64" x2="64" y1="84.75" y2="98.5"/><path class="cls-7" d="M64,113l9.66,3.51a1,1,0,0,0,1.34-.94V104.43a1,1,0,0,0-1.34-.94L64,107Z"/><path class="cls-7" d="M64,113l-9.66,3.51a1,1,0,0,1-1.34-.94V104.43a1,1,0,0,1,1.34-.94L64,107Z"/><circle class="cls-7" cx="64" cy="110" r="5"/><path class="cls-3" d="M64,103.25a11,11,0,0,1-10.78-8.8,11.4,11.4,0,0,0-.22,2.2,11,11,0,0,0,22,0,11.4,11.4,0,0,0-.22-2.2A11,11,0,0,1,64,103.25Z"/><path class="cls-8" d="M64,103.25a11,11,0,0,1-10.78-8.8,11.4,11.4,0,0,0-.22,2.2,11,11,0,0,0,22,0,11.4,11.4,0,0,0-.22-2.2A11,11,0,0,1,64,103.25Z"/><path class="cls-3" d="M72.78,101.1,64,105.74l-8.78-4.64a.9.9,0,0,0-1.22.7v8.4a.9.9,0,0,0,1.22.7L64,106.26l8.78,4.64a.9.9,0,0,0,1.22-.7v-8.4A.9.9,0,0,0,72.78,101.1Z"/><path class="cls-8" d="M72.78,101.1,64,105.74l-8.78-4.64a.9.9,0,0,0-1.22.7v8.4a.9.9,0,0,0,1.22.7L64,106.26l8.78,4.64a.9.9,0,0,0,1.22-.7v-8.4A.9.9,0,0,0,72.78,101.1Z"/><circle class="cls-4" cx="36.68" cy="64.43" r="7.93"/><path class="cls-9" d="M64,98.37A28.31,28.31,0,0,1,35.68,70.05V55.43a28.32,28.32,0,1,1,56.64,0V70.05A28.31,28.31,0,0,1,64,98.37Z"/><path class="cls-10" d="M60,94a7,7,0,0,1,8,0"/><path class="cls-7" d="M71.55,80a1,1,0,0,1,.94,1.07,8.56,8.56,0,0,1-17,0A1,1,0,0,1,56.45,80Z"/><path class="cls-11" d="M64,92h0a4,4,0,0,1-4-4V77h8V88A4,4,0,0,1,64,92Z"/><path class="cls-3" d="M51.25,82.26C51.25,76.59,56.93,72,63.92,72s12.67,4.59,12.67,10.26"/><path class="cls-4" d="M64,77h0a5,5,0,0,1-5-5V57H69V72A5,5,0,0,1,64,77Z"/><circle class="cls-7" cx="50" cy="62.51" r="3.15"/><line class="cls-10" x1="56" x2="72" y1="45" y2="45"/><ellipse class="cls-3" cx="63.91" cy="24.95" rx="18.28" ry="16.82"/><path class="cls-12" d="M80.83,18.58c-.41,10.66-9.9,19.19-21.58,19.19A23.05,23.05,0,0,1,50,35.83a18.9,18.9,0,0,0,13.93,5.94C74,41.77,82.19,34.24,82.19,25A15.72,15.72,0,0,0,80.83,18.58Z"/><circle class="cls-7" cx="78" cy="62.51" r="3.15"/><path class="cls-3" d="M87,53.77c-.4,1.69-10.86.65-12.55.25a3.15,3.15,0,1,1,1.46-6.12C77.58,48.3,87.38,52.08,87,53.77Z"/><path class="cls-3" d="M41,53.77c.4,1.69,10.86.65,12.55.25a3.15,3.15,0,0,0-1.46-6.12C50.42,48.3,40.62,52.08,41,53.77Z"/><line class="cls-10" x1="75" x2="81" y1="69" y2="69"/><line class="cls-10" x1="47" x2="53" y1="69" y2="69"/><path class="cls-7" d="M104,108.82l-2.39-5.68c-1.71-4-6.22-6.64-11.29-6.64H77l-.4,26.26A59.82,59.82,0,0,0,104,108.82Z"/><path class="cls-7" d="M23.59,108.82,26,103.14c1.71-4,6.23-6.64,11.29-6.64H50.59l.4,26.26A59.82,59.82,0,0,1,23.59,108.82Z"/></svg>`,
    "avatar-man-4": `<?xml version="1.0" ?><svg id="Layer_1" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style type="text/css">
    .st0{fill:#64B7B2;}
    .st1{fill:#00A79D;}
    .st2{fill:#DCC5A1;}
    .st3{fill:#EDD9B4;}
    .st4{fill-rule:evenodd;clip-rule:evenodd;fill:#BC9F82;}
    .st5{fill-rule:evenodd;clip-rule:evenodd;fill:#4B1F0D;}
    .st6{fill-rule:evenodd;clip-rule:evenodd;fill:#DCC5A1;}
    .st7{fill-rule:evenodd;clip-rule:evenodd;fill:#EDD9B4;}
    .st8{fill:#010101;}
    .st9{opacity:0.3;}
    .st10{clip-path:url(#SVGID_2_);fill:#5C3915;}
    .st11{clip-path:url(#SVGID_4_);fill:#5C3915;}
    .st12{fill-rule:evenodd;clip-rule:evenodd;fill:#EDEDED;}
    .st13{opacity:0.1;}
    .st14{clip-path:url(#SVGID_6_);fill-rule:evenodd;clip-rule:evenodd;fill:#010101;}
    .st15{fill:#342214;}
    .st16{fill:#FFFFFF;}
    .st17{fill:#BE1E2D;}
    .st18{fill:#200D45;}
  </style><g><path class="st0" d="M90.4,379.5c10.5-9.3,37.1-30,125.5-68.8l81,0.5c88.5,38.8,114.1,58.9,124.6,68.2c4.1,3.6,7.7,9.6,10.9,17.4   c24.7-35.1,39.2-77.9,39.2-124.1C471.7,153.6,375.1,57,256,57C136.9,57,40.3,153.6,40.3,272.8c0,46.2,14.5,89,39.2,124.1   C82.8,389.1,86.4,383,90.4,379.5z"/><path class="st1" d="M142.9,456.5c1.2-9.6,2-15.4,2-15.4s0,6.2,0,16.7c26.5,15.9,56.6,26.3,88.9,29.6l14.1-98.6l-11.1-16.3   l19.4-19.7l18.5,19.5l-10.7,16.5l14.1,98.6c32.2-3.3,62.3-13.7,88.7-29.5c0-10.5,0-16.8,0-16.8s0.8,5.9,2,15.5   c25-15.4,46.7-35.8,63.6-59.8c-3.3-7.7-6.9-13.8-10.9-17.4c-10.5-9.3-36.1-29.4-124.6-68.2l-81-0.5   c-88.5,38.8-115.1,59.5-125.5,68.8c-4.1,3.6-7.6,9.6-10.9,17.4C96.4,420.8,117.9,441.1,142.9,456.5z"/><g><path class="st2" d="M213.3,236.5v97.2c11.7,13.8,27.1,21,42.6,21.1V197.1C234.6,197.1,213.3,210.2,213.3,236.5z"/><path class="st3" d="M255.9,197.1v157.7c15.4,0.1,30.9-6.8,42.6-21.1v-97.2C298.5,210.2,277.2,197.1,255.9,197.1z"/></g><path class="st4" d="M298.5,232.6v65.1c-16.1,11.7-31.6,18.3-42.6,18.3c-10.9,0-26.5-6.6-42.6-18.3v-65.1   C213.3,180.1,298.5,180.1,298.5,232.6"/><path class="st5" d="M318.8,111.5c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.3-33.9,33.9   C284.9,96.3,300.1,111.5,318.8,111.5"/><path class="st5" d="M285.5,96.6c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C251.6,81.4,266.8,96.6,285.5,96.6"/><path class="st5" d="M234.6,91.4c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C200.6,76.1,215.9,91.4,234.6,91.4"/><path class="st5" d="M188.9,108c18.7,0,33.9-15.3,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C155,92.8,170.3,108,188.9,108"/><path class="st5" d="M162.6,145.8c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C128.7,130.5,143.9,145.8,162.6,145.8"/><path class="st5" d="M347.8,146.6c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.3-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C313.9,131.4,329.1,146.6,347.8,146.6"/><path class="st5" d="M349.5,194c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C315.6,178.8,330.9,194,349.5,194"/><path class="st5" d="M325,251.1c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C291,235.8,306.3,251.1,325,251.1"/><path class="st5" d="M160,188.8c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C126.1,173.5,141.3,188.8,160,188.8"/><path class="st5" d="M184.6,255.5c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C150.6,240.2,165.9,255.5,184.6,255.5"/><path class="st5" d="M344.7,226.5c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C310.7,211.2,326,226.5,344.7,226.5"/><path class="st5" d="M164.9,224.1c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C131,208.8,146.2,224.1,164.9,224.1"/><g><path class="st6" d="M157.5,176.1c-3.4-2.5-7.1-3.5-10.3-2.5c-7.5,2.5-10.1,15-5.8,27.9c4.3,13,13.8,21.5,21.3,19    c0.5-0.2,1-0.4,1.5-0.7c3.6,14.8,7.6,25.4,9.7,28.4c10.3,15.2,59.1,55.3,82.2,55.3V62C170.6,62,154.5,123.6,157.5,176.1z"/><path class="st7" d="M366.3,173.7c-3.8-1.3-8.1,0.3-12.1,3.9C357.6,124.7,342,62,255.9,62h0v241.7h0c23.1,0,71.9-40.2,82.2-55.3    c2.1-3.1,6.3-14.1,9.9-29.4c0.9,0.7,1.8,1.3,2.9,1.6c7.5,2.5,17-6,21.3-19C376.4,188.7,373.8,176.2,366.3,173.7z"/></g><path class="st5" d="M244.2,120.3c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C210.3,105.1,225.5,120.3,244.2,120.3"/><path class="st5" d="M290.7,118.6c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C256.8,103.3,272.1,118.6,290.7,118.6"/><path class="st5" d="M210,130.9c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C176.1,115.6,191.3,130.9,210,130.9"/><path class="st5" d="M184.8,142.7c15.9,0,28.9-13,28.9-28.9c0-15.9-13-28.9-28.9-28.9c-15.9,0-28.9,13-28.9,28.9   C155.9,129.7,168.9,142.7,184.8,142.7"/><path class="st5" d="M318,139.6c18.7,0,33.9-15.2,33.9-33.9c0-18.7-15.2-33.9-33.9-33.9c-18.7,0-33.9,15.2-33.9,33.9   C284,124.4,299.3,139.6,318,139.6"/><path class="st5" d="M345.5,162.6c13.2,0,23.9-10.8,23.9-23.9c0-13.2-10.8-23.9-23.9-23.9c-13.2,0-23.9,10.8-23.9,23.9   C321.6,151.9,332.3,162.6,345.5,162.6"/><path class="st5" d="M169.4,167.2c12.8,0,23.2-10.4,23.2-23.2c0-12.8-10.4-23.2-23.2-23.2c-12.8,0-23.2,10.4-23.2,23.2   C146.2,156.8,156.6,167.2,169.4,167.2"/><path class="st5" d="M164.6,183c8.2,0,14.8-6.7,14.8-14.8c0-8.2-6.7-14.8-14.8-14.8c-8.2,0-14.8,6.7-14.8,14.8   C149.7,176.4,156.4,183,164.6,183"/><path class="st5" d="M349.7,184.8c8.2,0,14.8-6.7,14.8-14.8c0-8.2-6.7-14.8-14.8-14.8c-8.2,0-14.8,6.7-14.8,14.8   C334.9,178.1,341.6,184.8,349.7,184.8"/><path class="st5" d="M166.3,196.2c5.8,0,10.4-4.7,10.4-10.4c0-5.7-4.7-10.4-10.4-10.4c-5.7,0-10.4,4.7-10.4,10.4   C155.9,191.5,160.6,196.2,166.3,196.2"/><path class="st5" d="M348,195.3c5.8,0,10.4-4.7,10.4-10.4c0-5.7-4.7-10.4-10.4-10.4c-5.7,0-10.4,4.7-10.4,10.4   C337.6,190.6,342.2,195.3,348,195.3"/><path class="st8" d="M349.6,171.9c-2.7-2.1-27.9-10.8-37.5-11.1c0,0-21.6-2.6-32.3,2.4c-10.7,4.9-12.9,4.2-23.3,4.7c0,0-0.4,0-1,0   c-0.7,0-1,0-1,0c-10.4-0.5-12.6,0.2-23.3-4.7c-10.7-4.9-32.3-2.4-32.3-2.4c-9.6,0.2-34.8,8.9-37.5,11.1c-2.7,2.1,0,5.5,0,5.5   c10.9-0.9,12.3,17.5,12.3,17.5c1.3,5,3.1,9.5,6,13.7c3.6,5.2,8.7,9.4,14.7,11.6c5.7,2.1,11,2.2,17.1,2.2c7.9-0.1,15.2-2.1,21.2-7.2   c11.1-9.3,14.9-33.5,14.9-33.5c-1.5-0.7-1.6-3.5-1.6-3.5c-0.1-4.1,6.4-4.5,8.5-4.5c0.3,0,0.6,0,1,0c0.4,0,0.7,0,1,0   c2,0,8.6,0.4,8.5,4.5c0,0-0.1,2.8-1.6,3.5c0,0,3.9,24.2,14.9,33.5c6,5,13.4,7.1,21.2,7.2c6.1,0.1,11.4-0.1,17.1-2.2   c6-2.2,11.1-6.4,14.7-11.6c2.9-4.2,4.8-8.8,6-13.7c0,0,1.4-18.5,12.4-17.5C349.6,177.4,352.3,174,349.6,171.9 M240.5,190.7   c-2,14.1-5.7,21.5-14.7,25.7c-9.1,4.2-17,3.5-17,3.5s-7.7,0.7-16.8-3.5c-9.1-4.2-12.5-11.6-14.5-25.7c-0.3-2.4-0.6-4.8-0.6-7.2   c0.1-6.6,3.3-13.9,9.7-16.8c4-1.8,9.4-2.4,13.7-2.7c2.8-0.2,5.7-0.4,8.5-0.4c0.9,0,1.8,0.1,2.7,0.2c7.3,0.6,16.1,0.6,22.4,4.8   c1.1,0.8,2.2,1.6,3.2,2.7C241.8,176.5,241.5,184.1,240.5,190.7 M333.4,190.7c-2,14.1-5.4,21.5-14.5,25.7   c-9.1,4.2-16.8,3.5-16.8,3.5s-7.9,0.7-17-3.5c-9.1-4.2-12.7-11.6-14.7-25.7c-0.9-6.6-1.3-14.2,3.5-19.4c1-1.1,2-1.9,3.2-2.7   c6.3-4.2,15.1-4.2,22.4-4.8c0.9-0.1,1.8-0.2,2.6-0.2c2.8,0,5.7,0.2,8.5,0.4c4.3,0.3,9.8,0.9,13.7,2.7c6.3,2.9,9.6,10.2,9.7,16.8   C334,185.8,333.8,188.3,333.4,190.7"/><g class="st9"><g><defs><rect height="56.3" id="SVGID_1_" width="64.2" x="176.9" y="163.5"/></defs><clipPath id="SVGID_2_"><use style="overflow:visible;" xlink:href="#SVGID_1_"/></clipPath><path class="st10" d="M240.5,190.7c-2,14.1-5.7,21.5-14.7,25.7c-9.1,4.2-17,3.5-17,3.5s-7.7,0.7-16.8-3.5     c-9.1-4.2-12.5-11.6-14.5-25.7c-0.3-2.4-0.6-4.8-0.6-7.2c0.1-6.6,3.3-13.9,9.7-16.8c4-1.8,9.4-2.4,13.7-2.7     c2.8-0.2,5.7-0.4,8.5-0.4c0.9,0,1.8,0.1,2.7,0.2c7.3,0.6,16.1,0.6,22.4,4.8c1.1,0.8,2.2,1.6,3.2,2.7     C241.8,176.5,241.5,184.1,240.5,190.7"/></g></g><g class="st9"><g><defs><rect height="56.3" id="SVGID_3_" width="64.2" x="269.8" y="163.5"/></defs><clipPath id="SVGID_4_"><use style="overflow:visible;" xlink:href="#SVGID_3_"/></clipPath><path class="st11" d="M333.4,190.7c-2,14.1-5.4,21.5-14.5,25.7c-9.1,4.2-16.8,3.5-16.8,3.5s-7.9,0.7-17-3.5     c-9.1-4.2-12.7-11.6-14.7-25.7c-0.9-6.6-1.3-14.2,3.5-19.4c1-1.1,2-1.9,3.2-2.7c6.3-4.2,15.1-4.2,22.4-4.8     c0.9-0.1,1.8-0.2,2.6-0.2c2.8,0,5.7,0.2,8.5,0.4c4.3,0.3,9.8,0.9,13.7,2.7c6.3,2.9,9.6,10.2,9.7,16.8     C334,185.8,333.8,188.3,333.4,190.7"/></g></g><g><polygon class="st12" points="213.3,299.4 209.3,313.6 219.8,389.7 255.9,352.4   "/><polygon class="st12" points="298.5,299.7 301.9,313.4 292.1,390.5 255.9,352.4   "/></g><g class="st13"><g><defs><rect height="0.5" id="SVGID_5_" width="16.3" x="247.8" y="388.8"/></defs><clipPath id="SVGID_6_"><use style="overflow:visible;" xlink:href="#SVGID_5_"/></clipPath><polygon class="st14" points="247.9,388.8 264.1,388.8 264.1,389.3 247.9,389.3    "/></g></g><g><path class="st15" d="M213.4,177.2c5.9,0,10.7,5.4,10.7,12.1c0,6.7-4.8,12.1-10.7,12.1c-5.9,0-10.7-5.4-10.7-12.1    C202.8,182.6,207.6,177.2,213.4,177.2"/><path class="st15" d="M300,177.2c5.9,0,10.7,5.4,10.7,12.1c0,6.7-4.8,12.1-10.7,12.1c-5.9,0-10.7-5.4-10.7-12.1    C289.4,182.6,294.1,177.2,300,177.2"/><path class="st16" d="M234.7,253.7c3.8,8.4,12.2,14.2,22,14.2c9.8,0,18.2-5.8,22-14.2H234.7z"/></g><polygon class="st17" points="256,488.5 256,488.5 256,488.5  "/><path class="st18" d="M142.9,456.5c0.7,0.4,1.4,0.8,2,1.2c0-10.4,0-16.7,0-16.7S144.1,446.9,142.9,456.5z"/><path class="st18" d="M366.9,457.9c0.7-0.4,1.4-0.8,2.1-1.3c-1.2-9.6-2-15.5-2-15.5S366.9,447.4,366.9,457.9z"/><path d="M264.1,388.8l10.8-16.4l-18.9-20l-19.3,20l11.3,16.4l-14.1,98.6c7.3,0.7,14.7,1.1,22.2,1.1h0c7.5,0,14.9-0.4,22.2-1.1   L264.1,388.8z"/></g></svg>`,
    "avatar-man-5": `<?xml version="1.0" ?><svg id="Layer_1" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><style type="text/css">
    .st0{fill:#00B8E9;}
    .st1{fill:#DCC5A1;}
    .st2{fill:#EDD9B4;}
    .st3{fill-rule:evenodd;clip-rule:evenodd;fill:#BC9F82;}
    .st4{fill:#FFFFFF;}
    .st5{fill:#E5917A;}
    .st6{fill-rule:evenodd;clip-rule:evenodd;fill:#422F18;}
    .st7{fill:#342214;}
    .st8{fill:#3E7EBC;}
    .st9{fill:#89BCE5;}
    .st10{fill:#BE1E2D;}
    .st11{fill:#E6E6E5;}
    .st12{fill:#1B75BC;}
    .st13{fill:#314E67;}
    .st14{fill-rule:evenodd;clip-rule:evenodd;fill:#FFFFFF;}
  </style><g><path class="st0" d="M83.2,374.5c10-8.9,34.1-27.7,108.8-61.8c0.5-0.2,1-0.5,1.5-0.7l16.7-7.5c0.3-0.1,0.6-0.3,0.9-0.4v20.3   l3.8,32.9c18.1-5.2,41.2-10.7,41.2-10.7l40.4,13.9l4.2-36.2l0-20.2c0.5,0.2,0.9,0.4,1.4,0.6l7.8,3.5c5,2.2,9.7,4.4,14.3,6.5   c9.6,4.4,18.3,8.5,26.2,12.4c51.6,25.3,69.7,39.8,78.3,47.4c3.4,3,6.6,7.8,9.4,13.8c21.2-33.4,33.5-73,33.5-115.5   C471.7,153.6,375.1,57,256,57S40.3,153.6,40.3,272.8c0,42.5,12.3,82.1,33.5,115.5C76.7,382.3,79.8,377.6,83.2,374.5z"/><path class="st1" d="M211.2,222.1v102.4c12.3,14.6,28.6,22.1,44.8,22.3V180.6C233.6,180.6,211.2,194.4,211.2,222.1z"/><path class="st2" d="M256,180.6v166.1c16.3,0.1,32.5-7.2,44.8-22.3V222.1C300.8,194.4,278.4,180.6,256,180.6z"/><path class="st3" d="M300.8,220.2v65.5c-17,11.8-33.3,18.4-44.8,18.4c-11.5,0-27.9-6.6-44.8-18.4v-65.5   C211.2,167.4,300.8,167.4,300.8,220.2"/><path class="st4" d="M204.4,219.2c0,0,43.6,14.7,98.4,0C302.8,219.2,262,268.6,204.4,219.2"/><path class="st5" d="M204.4,219.2c0,0,45.5,15.8,98.4,0C271.2,217.6,277.8,216,204.4,219.2"/><path class="st5" d="M204.4,219.2c0,0,48.6,47.1,98.4,0c0,0-10.7,34.1-46.7,34.2C220.1,253.6,204.4,219.2,204.4,219.2"/><g><path class="st1" d="M256,38.3c-91.4,0-107.3,67.1-103.5,123c-4-3.4-8.3-4.9-12.1-3.6c-7.9,2.6-10.7,15.8-6.2,29.4    c4.5,13.7,14.5,22.6,22.4,20c1-0.3,2-0.9,2.8-1.6c3.7,15.1,7.9,25.9,10,29c10.8,16,62.2,58.3,86.5,58.3h0L256,38.3L256,38.3z"/><path class="st2" d="M371.3,157.7c-3.7-1.2-7.9,0.1-11.7,3.3c3.7-55.9-12.3-122.7-103.6-122.7v254.6c24.3,0,75.7-42.3,86.5-58.3    c2.1-3.1,6.2-13.8,9.9-28.7c0.8,0.6,1.6,1,2.5,1.3c7.9,2.6,18-6.4,22.4-20C381.9,173.5,379.2,160.3,371.3,157.7z"/></g><path class="st6" d="M187.2,99.1c-8.7,47.7-30.6,43.2-28.9,99.2c-7-43.6-17.5-101.7,12.1-139.9c23.7-30.6,102.2-52.4,153-15.8   c56.1,12,38.6,126.3,31.1,147.9c-5.3-35-17-49.6-31.9-90.7C302.5,114.3,213.1,117.5,187.2,99.1"/><g><path class="st7" d="M212.9,158.6c5.8,0,10.6,5.4,10.6,12c0,6.6-4.7,12-10.6,12c-5.8,0-10.6-5.4-10.6-12    C202.3,163.9,207,158.6,212.9,158.6"/><path class="st7" d="M298.7,158.6c5.8,0,10.6,5.4,10.6,12c0,6.6-4.7,12-10.6,12c-5.8,0-10.6-5.4-10.6-12    C288.2,163.9,292.9,158.6,298.7,158.6"/><path class="st4" d="M234,234.5c3.8,8.3,12.1,14.1,21.8,14.1c9.7,0,18.1-5.8,21.8-14.1H234z"/></g><path class="st8" d="M193.5,312l16.7-7.5C204.5,307.1,198.9,309.6,193.5,312z"/><path class="st8" d="M302.2,304.8l7.8,3.5C307.5,307.1,304.9,306,302.2,304.8z"/><path class="st9" d="M192,312.7L192,312.7c0.5-0.2,1-0.5,1.5-0.7L192,312.7z"/><path class="st9" d="M211.2,304.1l-0.9,0.4C210.6,304.4,210.9,304.2,211.2,304.1L211.2,304.1z"/><path class="st9" d="M324.2,314.6l-14.2-6.3c5,2.2,9.7,4.4,14.3,6.5L324.2,314.6z"/><path class="st9" d="M300.8,304.2L300.8,304.2c0.5,0.2,0.9,0.4,1.4,0.6L300.8,304.2z"/><polygon class="st10" points="256,488.5 256,488.5 256,488.5  "/><path class="st8" d="M137.1,452.8c1.2-9.4,2-15.2,2-15.2s0,6.2,0,16.5c15.7,10.2,32.9,18.3,51.1,24.2l-29.9-60.7l35.2-23.5   l-43-20.1l39.5-61.3c-74.7,34.1-98.8,52.9-108.8,61.8c-3.4,3-6.6,7.8-9.4,13.8C90.1,414,111.7,436,137.1,452.8z"/><path class="st8" d="M428.8,374.5c-8.5-7.6-26.7-22.1-78.3-47.4c-7.9-3.9-16.6-8-26.2-12.4l35,59.3l-43,20.1l35.2,23.5l-29.9,60.8   c18.3-5.8,35.5-14,51.3-24.2c0-10.3,0-16.5,0-16.5s0.8,5.7,2,15.2c25.4-16.8,47-38.8,63.3-64.5   C435.3,382.3,432.2,377.6,428.8,374.5z"/><path class="st11" d="M230,486.9l0.1,1.1c0.9,0,1.7,0.1,2.6,0.1l0.1-0.8C231.9,487.2,231,487.1,230,486.9z"/><path class="st11" d="M230,486.9c0.9,0.1,1.9,0.2,2.8,0.3l14.7-103l-12-16.6l20.6-21c0,0-23.1,5.5-41.2,10.7L230,486.9z"/><path class="st11" d="M279.2,487.3l0.1,0.8c0.8,0,1.6-0.1,2.4-0.1l0.1-1C280.9,487.1,280,487.2,279.2,487.3z"/><path class="st11" d="M256.2,346.7l19.9,21l-11.8,16.6h0l14.7,103c0.9-0.1,1.8-0.2,2.7-0.3l14.8-126.4L256.2,346.7z"/><path class="st9" d="M215,357.4l-3.8-32.9v-20.3c-0.3,0.1-0.6,0.3-0.9,0.4l-16.7,7.5c-0.5,0.2-1,0.5-1.5,0.7L152.5,374l43,20.1   l-35.2,23.5l29.9,60.7c8.4,2.7,17,4.9,25.8,6.5c4.6,0.9,9.3,1.6,14,2.2L215,357.4z"/><path class="st9" d="M359.3,374l-35-59.3c-4.6-2.1-9.3-4.3-14.3-6.5l-7.8-3.5c-0.5-0.2-0.9-0.4-1.4-0.6l0,20.2l-4.2,36.2L281.8,487   c7.2-0.9,14.3-2.1,21.3-3.6c6.3-1.4,12.4-3.1,18.5-5l29.9-60.8l-35.2-23.5L359.3,374z"/><path class="st12" d="M264.4,384.3L264.4,384.3l11.8-16.6l-19.9-21l-20.6,21l12,16.6l-14.7,103c7.6,0.8,15.3,1.2,23.1,1.2   c0,0,0,0,0,0c7.8,0,15.5-0.4,23.1-1.2L264.4,384.3z"/><path class="st13" d="M137.1,452.8c0.7,0.4,1.3,0.9,2,1.3c0-10.3,0-16.5,0-16.5S138.3,443.3,137.1,452.8z"/><path class="st13" d="M372.9,454.1c0.7-0.4,1.3-0.9,2-1.3c-1.2-9.4-2-15.2-2-15.2S373,443.8,372.9,454.1z"/><polygon class="st14" points="211.2,290.6 207.2,305.8 218.2,385.2 256.2,346.7  "/><polygon class="st14" points="300.8,290.6 303.9,305.6 293.6,386 256.2,346.7  "/></g></svg>`

 

};


export interface EntityViewLayout {

  defaultUCViewLayout: UseCaseViewLayout;
  searchInputUCViewLayout: UseCaseViewLayout;
  tableUCViewLayout: UseCaseViewLayout
  selectableInputTableUCViewLayout: UseCaseViewLayout;
  viewUCViewLayout: UseCaseViewLayout;
  createUCViewLayout: UseCaseViewLayout;
  editUCViewLayout: UseCaseViewLayout;
}

export interface UseCaseViewLayout {
  title: string;
  titleTranslationID: string;
  parentEntityLabel: string;
  parentEntityLabelTranslationId: string;
  orderedView: boolean;
  ucViewLayout: FieldViewLayout[];
  iconOrientation: string;
  entityType: any;
}

export interface FieldViewLayout {
  entityFieldName: string;
  label: string;
  labelTranslationID?: string;
  placeholder?: string;
  placeholderTranslationID?: string;
  visible: boolean;
  disabled: boolean;
  order?: number;
  format?: string;
  type?: string;
  typeName?: string;
  icon?: string;
  required?: boolean;
  targetFieldDomain?: any;
  validators?: FieldValidator;
  defaultValue?: any;
  fieldGroup: GroupedFieldViewLayout;

}

export interface FieldValidator {

  syncValidators?: ValidatorMetaData[];
  asyncValidators?: ValidatorMetaData[];
  updateOn?: string;
}


export interface ValidatorMetaData {
  validatorID: string; 
  validatorKey: string;
  parameters?: any;
  type: string;
  nature: string;
  validationDefaultMessage?: string;
  validationMessageTranslationId?: string;
}

export interface GroupedFieldViewLayout {
  groupId: number;
  groupLabel?: string;
  groupLabelTranslationID?: string;
  groupOrder?: number;
  layout?: string; 
}

export class EnvironmentConfiguration {
  configurationItems: EnvironmentConfigurationItem[] = [];
}

export interface EnvironmentConfigurationItem {
  id: string;
  type: string;
}

export class ServiceConfigurationItem implements EnvironmentConfigurationItem {
  id: string;
  type: string = 'service';
  apiHost: string;
  apiPort: number;
  apiProtocol: string;
  apiEndPoint: string;
  apiProxy?: boolean;
  apiHTTPQueryBuilder: string;
  externalEntityId: string;
}

export class GatewayConfigurationItem implements EnvironmentConfigurationItem {
  id : string = 'APIServiceGateway';
  type: string = 'gateway';
  gatewayHost: string;
  gatewayPort: number;
  gatewayProtocol: string;
  apiEndpoints: ApiEndpoint[]=[];
}

export class ApiEndpoint {
  id: string;
  endpoint: string;
  queryBuilder: string;
  externalEntityId: string;
}

export class EntityConfiguration {
  configurationItems: EntityConfigurationItem[] = [];
  globalAPICollectionResponseMappingLookup: GlobalAPICollectionResponseMappingLookup = new GlobalAPICollectionResponseMappingLookup();
}

export class EntityConfigurationItem {
  configurationId: string;
  entityId: string;
  lifecycleId: string;
  externalKeysMapping: EntityKeysMapping[];

  constructor(
    configurationId: string = '',
    entityId: string = '',
    lifecycleId: string = '',
    externalKeysMapping: EntityKeysMapping[] = []
  ) {
    this.configurationId = configurationId;
    this.entityId = entityId;
    this.lifecycleId = lifecycleId;
    this.externalKeysMapping = externalKeysMapping.map(e => e.clone());
  }

  clone(): EntityConfigurationItem {
    return new EntityConfigurationItem(
      this.configurationId,
      this.entityId,
      this.lifecycleId,
      this.externalKeysMapping.map(e => e.clone())
    );
  }

  static fromJSON(json: any): EntityConfigurationItem {
    return new EntityConfigurationItem(
      json.configurationId,
      json.entityId,
      json.lifecycleId,
      (json.externalKeysMapping || []).map((ekm: any) =>
        new EntityKeysMapping(ekm.targetServices, ekm.keysMapping)
      )
    );
  }

}

export class EntityKeysMapping {
  targetServices: string[];
  keysMapping: Record<string, string|number>;
  constructor(
    targetServices: string[] = [],
    keysMapping: Record<string, string | number> = {}
  ) {
    this.targetServices = targetServices;
    this.keysMapping = keysMapping;
  }

  clone(): EntityKeysMapping {
    return new EntityKeysMapping(
      [...this.targetServices],
      { ...this.keysMapping }
    );
  }

  equals(other: EntityKeysMapping): boolean {
    if (!(other instanceof EntityKeysMapping)) return false;

    const sameServices = this.targetServices.length === other.targetServices.length &&
      this.targetServices.every((v, i) => v === other.targetServices[i]);

    const keys1 = Object.keys(this.keysMapping);
    const keys2 = Object.keys(other.keysMapping);
    const sameKeys = keys1.length === keys2.length &&
      keys1.every(k => other.keysMapping.hasOwnProperty(k) && this.keysMapping[k] === other.keysMapping[k]);

    return sameServices && sameKeys;
  }
}

export class GlobalAPICollectionResponseMappingLookup {
  data: string = "data";
  totalCount: string = "total_count";
  currentPageIndex: string = "current_page";
  pageSize: string = "page_size";
  totalPages: string = "total_pages";
}
//#############################################


type EntityValidator = {id: string, validationActions: ValidationAction[]};

type ValidationAction = {actionId: string, validationKey: string, 
                        actionNature: string, hasParameters?: boolean /** parameters value should be comma seperated. ex. value1, value2 => ex1. 50 ex2. 30, 40, "userid" */ };


export class PredefinedEntityValidators {

  private static standardValidators: EntityValidator[] = [
    {
      id: "Validators",
      validationActions:[
        { actionId: "email", validationKey: "email", actionNature: "sync" },
        { actionId: "required", validationKey: "required", actionNature: "sync"},
        { actionId: "maxLength", validationKey: "maxlength", actionNature: "sync", hasParameters: true }
      ]
    },
    {
      id: "GlobalCustomValidationService",
      validationActions:[
        { actionId: "emailAlreadyexistsValidator", validationKey: "emailNotAvailable", actionNature: "async" },
        { actionId: "birthDateValidator", validationKey: "invalidBirthDate_under18", actionNature: "sync" },
        { actionId: "regExpPatternValidator", validationKey: "invalidPattern", actionNature: "sync", hasParameters: true },
      ]
    }
  ]
  private constructor(){}

  public static isStandardValidator(validatorName: string): boolean{
    if (validatorName===null || validatorName===undefined){
      return false;
    }
    let validator = PredefinedEntityValidators.standardValidators.findIndex(e=>e.id===validatorName);
    return (validator>-1);
  }

  public static getPredefinedValidationAction(validatorName: string, validationAction: string): ValidationAction {
    if (validatorName===null || validatorName===undefined ||
        validationAction===null || validationAction===undefined){
      return null;
    }
    let validator = PredefinedEntityValidators.standardValidators.find(e=>e.id===validatorName);
    if (validator===null || validator===undefined){
      return null;
    } else {
      return validator?.validationActions.find(e=>e.actionId===validationAction);
    }
  }

}

export const AVEROS_VALIDATOR_WORKFLOW = "averos-validator";
export const PREDEFINED_VALIDATOR_WORKFLOW = "predefined-validator";
export const CUSTOM_VALIDATOR_WORKFLOW = "custom-validator"

export const PREDEFINED_ACTION_GLOBAL_CUSTOM_VALIDATOR_WORKFLOW =  "predefined-action-global-custom-validator";
export const PREDEFINED_ACTION_VALIDATORS_WORKFLOW =  "predefined-action-validators";
export const PREDEFINED_ACTION_PARAMETERS_WORKFLOW = "predefined-action-parameters";